import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Optional
from urllib.parse import quote
from uuid import uuid4

import anyio
from starlette.applications import Starlette
from starlette.requests import Request as StarletteRequest
from starlette.responses import JSONResponse, Response
from starlette.routing import Mount, Route
from starlette.types import Receive, Scope, Send
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from mcp.server.mcpserver import MCPServer, Context
from mcp.server.sse import (
    AuthenticatedUser,
    DEFAULT_MAX_REQUEST_BODY_SIZE,
    EventSourceResponse,
    SessionMessage,
    SseServerTransport,
    TransportSecuritySettings,
    authorization_context,
    create_context_streams,
)
from app.auth.security import decode_token
from app.db.session import SessionLocal
from app.db.tenant_manager import TenantDatabaseManager
from app.models.master import Tenant
from app import models

logger = logging.getLogger("flow_cmms.mcp")

# Initialize MCPServer
mcp_server = MCPServer(
    name="flow-cmms",
    instructions=(
        "Servidor MCP do Flow CMMS para gerenciamento de equipamentos médicos hospitalares, "
        "ordens de serviço de manutenção, chamados técnicos e controle de estoque de peças sobressalentes. "
        "Permite que agentes de IA consultem equipamentos, verifiquem históricos de manutenção e abram novos chamados."
    ),
)


def resolve_tenant_from_request(request: StarletteRequest) -> Optional[str]:
    """
    Extracts tenant slug from request query parameters, Authorization header, or X-Tenant-ID header.
    """
    # 1. Query parameters
    tenant_slug = (
        request.query_params.get("s")
        or request.query_params.get("tenant")
        or request.query_params.get("tenant_id")
    )
    if tenant_slug:
        return tenant_slug.strip()

    # 2. Authorization header (Bearer token)
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        raw_jwt = auth.split(" ", 1)[1].strip()
        payload = decode_token(raw_jwt)
        if payload and payload.get("tenant_slug"):
            return payload.get("tenant_slug")

    # 3. Query param token
    token = request.query_params.get("token")
    if token:
        payload = decode_token(token)
        if payload and payload.get("tenant_slug"):
            return payload.get("tenant_slug")

    # 4. Header X-Tenant-ID
    x_tenant = request.headers.get("X-Tenant-ID") or request.headers.get("x-tenant-id")
    if x_tenant:
        return x_tenant.strip()

    return None


class TenantSseServerTransport(SseServerTransport):
    """
    Custom SSE Transport that associates each MCP session with its hospital tenant (tenant_slug).
    Carries tenant_slug forward in client message endpoint URLs and session state.
    """

    def __init__(
        self,
        endpoint: str = "/messages",
        security_settings: TransportSecuritySettings | None = None,
        max_request_body_size: int = DEFAULT_MAX_REQUEST_BODY_SIZE,
    ):
        super().__init__(
            endpoint=endpoint,
            security_settings=security_settings,
            max_request_body_size=max_request_body_size,
        )
        self.session_tenants: dict[str, str] = {}

    @asynccontextmanager
    async def connect_sse(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            logger.error("connect_sse received non-HTTP request")
            raise ValueError("connect_sse can only handle HTTP requests")

        request = StarletteRequest(scope, receive)
        error_response = await self._security.validate_request(request, is_post=False)
        if error_response:
            await error_response(scope, receive, send)
            raise ValueError("Request validation failed")

        tenant_slug = resolve_tenant_from_request(request)

        read_stream_writer, read_stream = create_context_streams[SessionMessage | Exception](0)
        write_stream, write_stream_reader = create_context_streams[SessionMessage](0)

        session_id = uuid4()
        session_id_hex = session_id.hex
        user = scope.get("user")
        if isinstance(user, AuthenticatedUser):
            self._session_owners[session_id] = authorization_context(user)
        self._read_stream_writers[session_id] = read_stream_writer

        if tenant_slug:
            self.session_tenants[session_id_hex] = tenant_slug

        root_path = scope.get("root_path", "")
        full_message_path = root_path.rstrip("/") + self._endpoint
        if tenant_slug:
            client_post_uri = f"{quote(full_message_path)}?session_id={session_id_hex}&s={quote(tenant_slug)}"
        else:
            client_post_uri = f"{quote(full_message_path)}?session_id={session_id_hex}"

        sse_stream_writer, sse_stream_reader = anyio.create_memory_object_stream[dict[str, Any]](0)

        async def sse_writer():
            async with sse_stream_writer, write_stream_reader:
                await sse_stream_writer.send({"event": "endpoint", "data": client_post_uri})
                async for session_message in write_stream_reader:
                    await sse_stream_writer.send(
                        {
                            "event": "message",
                            "data": session_message.message.model_dump_json(by_alias=True, exclude_unset=True),
                        }
                    )

        try:
            async with anyio.create_task_group() as tg:
                async def response_wrapper(scope: Scope, receive: Receive, send: Send):
                    await EventSourceResponse(
                        content=sse_stream_reader,
                        data_sender_callable=sse_writer,
                    )(scope, receive, send)
                    await read_stream_writer.aclose()
                    await write_stream_reader.aclose()
                    await sse_stream_reader.aclose()

                tg.start_soon(response_wrapper, scope, receive, send)
                yield (read_stream, write_stream)
        finally:
            self._read_stream_writers.pop(session_id, None)
            self._session_owners.pop(session_id, None)
            self.session_tenants.pop(session_id_hex, None)

    async def _handle_post_message(self, scope: Scope, receive: Receive, send: Send) -> None:
        request = StarletteRequest(scope, receive)
        session_id_param = request.query_params.get("session_id")
        s_param = request.query_params.get("s")
        if session_id_param and s_param:
            self.session_tenants[session_id_param] = s_param
        await super()._handle_post_message(scope, receive, send)


# Global transport instance
mcp_transport = TenantSseServerTransport(
    endpoint="/messages",
    security_settings=TransportSecuritySettings(enable_dns_rebinding_protection=False),
)


def get_tenant_db_for_tool(ctx: Context) -> tuple[Session, str]:
    """
    Resolves the tenant DB session for a tool call using the session registry,
    request parameters, or fallback.
    """
    req = getattr(getattr(ctx, "request_context", None), "request", None)
    tenant_slug = None

    if req:
        # 1. Session ID from SSE connection
        session_id = req.query_params.get("session_id")
        if session_id and session_id in mcp_transport.session_tenants:
            tenant_slug = mcp_transport.session_tenants[session_id]

        # 2. Direct query param or headers on message
        if not tenant_slug:
            tenant_slug = resolve_tenant_from_request(req)

    # 3. Fallback: single active tenant if only one exists in DB
    master_db = SessionLocal()
    try:
        if not tenant_slug:
            active_tenants = master_db.query(Tenant).filter(Tenant.is_active == True).all()
            if len(active_tenants) == 1:
                tenant_slug = active_tenants[0].slug

        if not tenant_slug:
            raise ValueError(
                "Unidade hospitalar não identificada. Por favor, conecte-se com o parâmetro "
                "?s={slug_hospital} ou forneça um Token MCP válido gerado no Gerenciador."
            )

        tenant = master_db.query(Tenant).filter(Tenant.slug == tenant_slug).first()
        if not tenant:
            raise ValueError(f"Unidade hospitalar '{tenant_slug}' não encontrada.")
        if not tenant.is_active:
            raise ValueError(f"Unidade hospitalar '{tenant.name}' está inativa.")

        db_name = tenant.db_name
    finally:
        master_db.close()

    db = TenantDatabaseManager.get_session(db_name)
    return db, tenant_slug


# ============================================================================
# MCP Tools for AI Agents
# ============================================================================


@mcp_server.tool()
async def consultar_equipamentos(
    busca: Optional[str] = None,
    localizacao: Optional[str] = None,
    status: Optional[str] = None,
    apenas_ativos: bool = True,
    limite: int = 50,
    ctx: Context = None,
) -> dict:
    """
    Pesquisa e lista equipamentos médicos cadastrados na unidade hospitalar conectada.
    
    Args:
        busca: Filtro textual por nome, modelo, fabricante, número de série ou registro ANVISA.
        localizacao: Filtro por setor ou localização do equipamento (ex: UTI, Centro Cirúrgico, Pronto Socorro).
        status: Filtro por status operacional (ex: 'active', 'maintenance', 'inactive').
        apenas_ativos: Se True, oculta equipamentos marcados como excluídos (padrão: True).
        limite: Limite de registros retornados (padrão: 50).
    """
    db, tenant_slug = get_tenant_db_for_tool(ctx)
    try:
        query = db.query(models.Equipment)
        if apenas_ativos:
            query = query.filter(models.Equipment.is_deleted == False)

        if localizacao:
            query = query.filter(models.Equipment.location.ilike(f"%{localizacao.strip()}%"))

        if status:
            query = query.filter(func.lower(models.Equipment.status) == status.strip().lower())

        if busca:
            clean_search = f"%{busca.strip()}%"
            query = query.filter(
                or_(
                    models.Equipment.name.ilike(clean_search),
                    models.Equipment.model.ilike(clean_search),
                    models.Equipment.manufacturer.ilike(clean_search),
                    models.Equipment.serial_number.ilike(clean_search),
                    models.Equipment.anvisa_register.ilike(clean_search),
                    models.Equipment.location.ilike(clean_search),
                )
            )

        equipments = query.order_by(models.Equipment.name.asc()).limit(limite).all()
        return {
            "unidade": tenant_slug,
            "total_encontrado": len(equipments),
            "equipamentos": [
                {
                    "id": eq.id,
                    "nome": eq.name,
                    "modelo": eq.model,
                    "fabricante": eq.manufacturer,
                    "numero_serie": eq.serial_number,
                    "registro_anvisa": eq.anvisa_register,
                    "tipo": eq.equipment_type,
                    "localizacao": eq.location,
                    "status": eq.status,
                    "garantia_ate": eq.warranty_end.isoformat() if eq.warranty_end else None,
                }
                for eq in equipments
            ],
        }
    finally:
        db.close()


@mcp_server.tool()
async def obter_equipamento(
    equipamento_id: int,
    ctx: Context = None,
) -> dict:
    """
    Obtém detalhes completos de um equipamento médico específico e seu histórico recente de ordens de serviço.

    Args:
        equipamento_id: ID numérico do equipamento no sistema.
    """
    db, tenant_slug = get_tenant_db_for_tool(ctx)
    try:
        eq = (
            db.query(models.Equipment)
            .filter(models.Equipment.id == equipamento_id, models.Equipment.is_deleted == False)
            .first()
        )
        if not eq:
            return {"erro": f"Equipamento ID {equipamento_id} não encontrado na unidade '{tenant_slug}'."}

        # Busca até 5 manutenções recentes
        recent_maint = (
            db.query(models.Maintenance)
            .filter(models.Maintenance.equipment_id == equipamento_id)
            .order_by(models.Maintenance.created_at.desc())
            .limit(5)
            .all()
        )

        return {
            "unidade": tenant_slug,
            "equipamento": {
                "id": eq.id,
                "nome": eq.name,
                "descricao": eq.description,
                "modelo": eq.model,
                "fabricante": eq.manufacturer,
                "numero_serie": eq.serial_number,
                "registro_anvisa": eq.anvisa_register,
                "tipo": eq.equipment_type,
                "localizacao": eq.location,
                "status": eq.status,
                "data_compra": eq.purchase_date.isoformat() if eq.purchase_date else None,
                "garantia_ate": eq.warranty_end.isoformat() if eq.warranty_end else None,
                "especificacoes": eq.specifications,
                "cadastrado_em": eq.created_at.isoformat() if eq.created_at else None,
            },
            "historico_manutencoes_recentes": [
                {
                    "id": m.id,
                    "tipo": m.type,
                    "status": m.status,
                    "urgencia": m.urgency,
                    "descricao": m.description,
                    "solicitante": m.requester_name,
                    "data_abertura": m.created_at.isoformat() if m.created_at else None,
                }
                for m in recent_maint
            ],
        }
    finally:
        db.close()


@mcp_server.tool()
async def consultar_ordens_servico(
    equipamento_id: Optional[int] = None,
    status: Optional[str] = None,
    tipo: Optional[str] = None,
    solicitante: Optional[str] = None,
    limite: int = 50,
    ctx: Context = None,
) -> dict:
    """
    Lista ordens de serviço e chamados de manutenção na unidade hospitalar.

    Args:
        equipamento_id: Filtra ordens de um equipamento específico.
        status: Filtra por status: 'pending', 'in_progress', 'completed', 'cancelled'.
        tipo: Filtra por tipo: 'preventive', 'corrective'.
        solicitante: Filtra por nome do solicitante que abriu o chamado.
        limite: Quantidade máxima de registros retornados (padrão: 50).
    """
    db, tenant_slug = get_tenant_db_for_tool(ctx)
    try:
        query = db.query(models.Maintenance)

        if equipamento_id:
            query = query.filter(models.Maintenance.equipment_id == equipamento_id)

        if status:
            query = query.filter(func.lower(models.Maintenance.status) == status.strip().lower())

        if tipo:
            query = query.filter(func.lower(models.Maintenance.type) == tipo.strip().lower())

        if solicitante:
            clean_req = f"%{solicitante.strip()}%"
            query = query.filter(models.Maintenance.requester_name.ilike(clean_req))

        orders = query.order_by(models.Maintenance.created_at.desc()).limit(limite).all()

        return {
            "unidade": tenant_slug,
            "total_encontrado": len(orders),
            "ordens_servico": [
                {
                    "id": o.id,
                    "equipamento_id": o.equipment_id,
                    "equipamento_nome": o.equipment.name if o.equipment else None,
                    "tipo": o.type,
                    "status": o.status,
                    "urgencia": o.urgency,
                    "descricao": o.description,
                    "solicitante_nome": o.requester_name,
                    "solicitante_setor": o.requester_sector,
                    "solicitante_contato": o.requester_contact,
                    "tecnico": o.technician,
                    "criado_em": o.created_at.isoformat() if o.created_at else None,
                }
                for o in orders
            ],
        }
    finally:
        db.close()


@mcp_server.tool()
async def abrir_chamado_manutencao(
    equipamento_id: int,
    descricao: str,
    nome_solicitante: str,
    setor_solicitante: Optional[str] = None,
    ramal_contato: Optional[str] = None,
    urgencia: str = "medium",
    tipo: str = "corrective",
    ctx: Context = None,
) -> dict:
    """
    Abre um novo chamado técnico ou ordem de serviço de manutenção para um equipamento médico.

    Args:
        equipamento_id: ID do equipamento que apresentou defeito ou necessita de intervenção.
        descricao: Descrição clara do problema, falha observada ou motivo do chamado.
        nome_solicitante: Nome ou identificação de quem está solicitando o reparo (médico, enfermeiro, técnico).
        setor_solicitante: Setor onde o solicitante está alocado (ex: UTI, Sala 3).
        ramal_contato: Ramal telefônico ou telefone de contato do solicitante.
        urgencia: Nível de urgência: 'low' (baixa), 'medium' (média), 'high' (alta) ou 'critical' (crítica). Padrão: 'medium'.
        tipo: Tipo da manutenção: 'corrective' (corretiva) ou 'preventive' (preventiva). Padrão: 'corrective'.
    """
    db, tenant_slug = get_tenant_db_for_tool(ctx)
    try:
        equipment = (
            db.query(models.Equipment)
            .filter(models.Equipment.id == equipamento_id, models.Equipment.is_deleted == False)
            .first()
        )
        if not equipment:
            return {"sucesso": False, "erro": f"Equipamento ID {equipamento_id} não encontrado na unidade '{tenant_slug}'."}

        # Busca dados do usuário solicitante para enriquecer setor e ramal caso não informados
        user = (
            db.query(models.User)
            .filter(func.lower(models.User.username) == nome_solicitante.strip().lower())
            .first()
        )

        if user and user.full_name:
            requester_display = f"{user.full_name} ({user.username})"
        else:
            requester_display = nome_solicitante.strip()

        final_sector = (
            setor_solicitante.strip()
            if setor_solicitante
            else (user.sector if user and user.sector else equipment.location)
        )
        final_contact = (
            ramal_contato.strip()
            if ramal_contato
            else (user.phone_extension if user and user.phone_extension else None)
        )

        new_maintenance = models.Maintenance(
            equipment_id=equipamento_id,
            type=tipo.strip().lower(),
            description=descricao.strip(),
            opening_report=descricao.strip(),
            status="pending",
            urgency=urgencia.strip().lower(),
            requester_name=requester_display,
            requester_sector=final_sector,
            requester_contact=final_contact,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(new_maintenance)
        db.flush()

        # Cria entrada no histórico da OS indicando abertura via agente MCP
        initial_entry = models.MaintenanceEntry(
            maintenance_id=new_maintenance.id,
            entry_type="general_observation",
            notes=f"Chamado aberto via Agente IA (MCP) por {requester_display}. Urgência: {urgencia.upper()}.",
            registered_by=f"MCP Agent ({requester_display})",
            created_at=datetime.utcnow(),
        )
        db.add(initial_entry)
        db.commit()
        db.refresh(new_maintenance)

        return {
            "sucesso": True,
            "mensagem": f"Ordem de serviço #{new_maintenance.id} aberta com sucesso para o equipamento '{equipment.name}'.",
            "unidade": tenant_slug,
            "ordem_servico": {
                "id": new_maintenance.id,
                "equipamento_id": equipment.id,
                "equipamento_nome": equipment.name,
                "equipamento_localizacao": equipment.location,
                "descricao": new_maintenance.description,
                "solicitante": new_maintenance.requester_name,
                "setor": new_maintenance.requester_sector,
                "contato": new_maintenance.requester_contact,
                "urgencia": new_maintenance.urgency,
                "status": new_maintenance.status,
                "criado_em": new_maintenance.created_at.isoformat(),
            },
        }
    except Exception as e:
        db.rollback()
        return {"sucesso": False, "erro": str(e)}
    finally:
        db.close()


@mcp_server.tool()
async def consultar_estoque_pecas(
    busca: Optional[str] = None,
    limite: int = 50,
    ctx: Context = None,
) -> dict:
    """
    Consulta o estoque de peças sobressalentes e componentes no almoxarifado da unidade hospitalar.

    Args:
        busca: Filtra por nome da peça ou part_number.
        limite: Quantidade máxima de registros retornados (padrão: 50).
    """
    db, tenant_slug = get_tenant_db_for_tool(ctx)
    try:
        query = db.query(models.InventoryItem)
        if busca:
            clean_search = f"%{busca.strip()}%"
            query = query.filter(
                or_(
                    models.InventoryItem.name.ilike(clean_search),
                    models.InventoryItem.part_number.ilike(clean_search),
                    models.InventoryItem.description.ilike(clean_search),
                )
            )

        items = query.order_by(models.InventoryItem.name.asc()).limit(limite).all()
        return {
            "unidade": tenant_slug,
            "total_encontrado": len(items),
            "itens": [
                {
                    "id": item.id,
                    "nome": item.name,
                    "part_number": item.part_number,
                    "quantidade": item.quantity,
                    "quantidade_minima": item.min_quantity,
                    "localizacao": item.location,
                    "fornecedor": item.supplier,
                    "alerta_reposicao": item.quantity <= item.min_quantity if item.min_quantity else False,
                }
                for item in items
            ],
        }
    finally:
        db.close()


@mcp_server.tool()
async def obter_resumo_unidade(
    ctx: Context = None,
) -> dict:
    """
    Retorna indicadores e estatísticas operacionais da unidade hospitalar conectada.
    Inclui total de equipamentos, equipamentos em manutenção e contagem de chamados pendentes.
    """
    db, tenant_slug = get_tenant_db_for_tool(ctx)
    try:
        total_equipments = db.query(models.Equipment).filter(models.Equipment.is_deleted == False).count()
        in_maintenance = (
            db.query(models.Equipment)
            .filter(models.Equipment.is_deleted == False, models.Equipment.status == "maintenance")
            .count()
        )
        pending_orders = db.query(models.Maintenance).filter(models.Maintenance.status == "pending").count()
        in_progress_orders = (
            db.query(models.Maintenance).filter(models.Maintenance.status == "in_progress").count()
        )
        completed_orders = (
            db.query(models.Maintenance).filter(models.Maintenance.status == "completed").count()
        )

        return {
            "unidade": tenant_slug,
            "resumo": {
                "total_equipamentos_ativos": total_equipments,
                "equipamentos_em_manutencao": in_maintenance,
                "chamados_pendentes": pending_orders,
                "chamados_em_andamento": in_progress_orders,
                "chamados_concluidos": completed_orders,
            },
        }
    finally:
        db.close()


# ============================================================================
# ASGI SSE Endpoint & Starlette App
# ============================================================================


class SseEndpoint:
    """
    Pure ASGI endpoint for MCP SSE connection.
    Validates tenant and connects client event stream.
    """

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            return

        request = StarletteRequest(scope, receive)

        # Informative response if an MCP client attempts HTTP POST directly to /sse
        if scope.get("method") == "POST":
            resp = JSONResponse(
                {
                    "status": "info",
                    "message": (
                        "Conexão MCP SSE requer método GET com 'Accept: text/event-stream'. "
                        "Após estabelecer a conexão SSE, envie mensagens POST para o endpoint "
                        "indicado no evento 'endpoint' (/mcp/messages)."
                    ),
                },
                status_code=400,
            )
            await resp(scope, receive, send)
            return

        tenant_slug = resolve_tenant_from_request(request)
        if tenant_slug:
            master_db = SessionLocal()
            try:
                tenant = master_db.query(Tenant).filter(Tenant.slug == tenant_slug).first()
                if not tenant:
                    resp = JSONResponse(
                        {"detail": f"Unidade hospitalar '{tenant_slug}' não encontrada."},
                        status_code=404,
                    )
                    await resp(scope, receive, send)
                    return
                if not tenant.is_active:
                    resp = JSONResponse(
                        {"detail": f"Unidade hospitalar '{tenant.name}' está inativa no momento."},
                        status_code=403,
                    )
                    await resp(scope, receive, send)
                    return
            finally:
                master_db.close()

        async with mcp_transport.connect_sse(scope, receive, send) as streams:
            if streams is not None:
                await mcp_server._lowlevel_server.run(
                    streams[0],
                    streams[1],
                    mcp_server._lowlevel_server.create_initialization_options(),
                )


def create_mcp_app() -> Starlette:
    """
    Creates the Starlette application that exposes both SSE and message endpoints
    for the Model Context Protocol (MCP).
    """

    async def root_status(request: StarletteRequest) -> Response:
        return JSONResponse(
            {
                "status": "online",
                "service": "Flow-CMMS MCP Server",
                "protocol": "Model Context Protocol (SSE transport)",
                "endpoints": {
                    "sse": "/mcp/sse?s={slug_hospital}",
                    "messages": "/mcp/messages?session_id={session_id}&s={slug_hospital}",
                },
            }
        )

    routes = [
        Route("/", endpoint=root_status, methods=["GET"]),
        Route("/sse", endpoint=SseEndpoint(), methods=["GET", "POST"]),
        Mount("/messages", app=mcp_transport.handle_post_message),
    ]

    return Starlette(routes=routes)
