import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.mcp.server import (
    mcp_server,
    consultar_equipamentos,
    obter_equipamento,
    consultar_ordens_servico,
    abrir_chamado_manutencao,
    consultar_estoque_pecas,
    obter_resumo_unidade,
)

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

def test_mcp_root_status(client):
    res = client.get("/mcp")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "Flow-CMMS MCP Server" in data["service"]

def test_mcp_sse_post_returns_helpful_message(client):
    res = client.post("/mcp/sse?s=matriz")
    assert res.status_code == 400
    data = res.json()
    assert "Conexão MCP SSE requer método GET" in data["message"]

def test_mcp_sse_nonexistent_tenant(client):
    res = client.get("/mcp/sse?s=unidade_fantasma_xyz")
    assert res.status_code == 404
    data = res.json()
    assert "unidade_fantasma_xyz" in data["detail"]

@pytest.mark.anyio
async def test_mcp_tools_execution():
    """
    Test direct tool executions resolving the tenant DB.
    """
    class MockRequest:
        query_params = {"s": "matriz"}
        headers = {}

    class MockRequestContext:
        request = MockRequest()

    class MockContext:
        request_context = MockRequestContext()

    ctx = MockContext()

    # 1. Obter resumo da unidade 'matriz'
    resumo = await obter_resumo_unidade(ctx=ctx)
    assert resumo["unidade"] == "matriz"
    assert "total_equipamentos_ativos" in resumo["resumo"]

    # 2. Consultar equipamentos
    eq_res = await consultar_equipamentos(ctx=ctx)
    assert eq_res["unidade"] == "matriz"
    assert isinstance(eq_res["equipamentos"], list)

    # 3. Consultar ordens de serviço
    os_res = await consultar_ordens_servico(ctx=ctx)
    assert os_res["unidade"] == "matriz"
    assert isinstance(os_res["ordens_servico"], list)

    # 4. Consultar estoque de peças
    estoque_res = await consultar_estoque_pecas(ctx=ctx)
    assert estoque_res["unidade"] == "matriz"
    assert isinstance(estoque_res["itens"], list)

    # 5. Se houver equipamento, testar obter_equipamento e abrir_chamado
    if len(eq_res["equipamentos"]) > 0:
        target_eq = eq_res["equipamentos"][0]
        eq_id = target_eq["id"]

        detalhes = await obter_equipamento(equipamento_id=eq_id, ctx=ctx)
        assert detalhes["unidade"] == "matriz"
        assert detalhes["equipamento"]["id"] == eq_id

        # Abrir chamado via MCP
        ticket_res = await abrir_chamado_manutencao(
            equipamento_id=eq_id,
            descricao="Alarme sonoro persistente acionado sem causa aparente",
            nome_solicitante="dr_mcp_test",
            setor_solicitante="Emergência Adulto",
            ramal_contato="1999",
            urgencia="high",
            tipo="corrective",
            ctx=ctx,
        )
        assert ticket_res["sucesso"] is True
        assert ticket_res["unidade"] == "matriz"
        assert ticket_res["ordem_servico"]["equipamento_id"] == eq_id
        assert ticket_res["ordem_servico"]["urgencia"] == "high"
