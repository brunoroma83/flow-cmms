from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta

from app.db.session import get_master_db
from app.db.tenant_manager import TenantDatabaseManager
from app.models.master import ManagerUser, Tenant
from app.models.user import User as TenantUser
from app.schemas.master import (
    TenantCreate, TenantUpdate, TenantResponse,
    ManagerUserCreate, ManagerUserUpdate, ManagerUserResponse,
    ManagerLoginRequest, ManagerLoginResponse
)
from app.auth.security import (
    verify_password, get_password_hash, create_access_token, decode_token
)
from app.core.config import settings

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/manager/auth/token")

def get_current_manager_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_master_db)
) -> ManagerUser:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de gerenciador inválido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if payload.get("scope") != "manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso não autorizado para o painel de gerenciamento de clientes."
        )
    username = payload.get("sub")
    user = db.query(ManagerUser).filter(ManagerUser.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário gerenciador não encontrado ou inativo."
        )
    return user

def require_superadmin(
    current_user: ManagerUser = Depends(get_current_manager_user)
) -> ManagerUser:
    if current_user.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito apenas ao Administrador da Plataforma (Superadmin)."
        )
    return current_user

# ============================================================================
# Autenticação do Gerenciador
# ============================================================================

@router.post("/auth/token", response_model=ManagerLoginResponse)
def manager_login(form_data: ManagerLoginRequest, db: Session = Depends(get_master_db)):
    user = db.query(ManagerUser).filter(ManagerUser.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha do gerenciador inválidos.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário gerenciador desativado.")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 4)
    access_token = create_access_token(
        data={"sub": user.username, "scope": "manager", "role": user.role},
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/auth/me", response_model=ManagerUserResponse)
def get_manager_me(current_user: ManagerUser = Depends(get_current_manager_user)):
    return current_user

@router.post("/auth/change-password")
def change_manager_password(
    data: dict,
    current_user: ManagerUser = Depends(get_current_manager_user),
    db: Session = Depends(get_master_db)
):
    """
    Permite que qualquer gestor (ou superadmin) altere a sua própria senha de acesso.
    """
    current_password = data.get("current_password", "").strip()
    new_password = data.get("new_password", "").strip()

    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Senha atual e nova senha são obrigatórias.")

    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="A senha atual está incorreta.")

    if len(new_password) < 4:
        raise HTTPException(status_code=400, detail="A nova senha deve ter pelo menos 4 caracteres.")

    current_user.hashed_password = get_password_hash(new_password)
    db.commit()
    return {"message": "Senha alterada com sucesso!"}

# ============================================================================
# Gestão de Clientes / Tenants
# ============================================================================


@router.get("/tenants", response_model=List[TenantResponse])
def list_tenants(
    current_user: ManagerUser = Depends(get_current_manager_user),
    db: Session = Depends(get_master_db)
):
    """
    Retorna clientes com filtragem estrita de RBAC:
    - Superadmin: visão total de todos os clientes cadastrados.
    - Operador/Manager: visão apenas dos clientes aos quais foi atribuído.
    """
    if current_user.role == "superadmin":
        return db.query(Tenant).order_by(Tenant.id.desc()).all()
    else:
        return current_user.assigned_tenants

@router.post("/tenants", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(
    tenant_in: TenantCreate,
    current_user: ManagerUser = Depends(get_current_manager_user),
    db: Session = Depends(get_master_db)
):
    """
    Cadastra novo cliente, cria dinamicamente o banco de dados dedicado no PostgreSQL
    e provisiona todas as tabelas e usuário administrador inicial desse cliente.
    """
    # Slug verification
    existing = db.query(Tenant).filter(Tenant.slug == tenant_in.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"O identificador/slug '{tenant_in.slug}' já está em uso.")

    db_name = TenantDatabaseManager.sanitize_db_name(tenant_in.slug)

    try:
        # 1. Create physical database in PostgreSQL
        TenantDatabaseManager.create_tenant_database(db_name)

        # 2. Provision tenant tables schema
        TenantDatabaseManager.provision_tenant_schema(db_name)

        # 3. Create default tenant admin user inside the new tenant database
        tenant_session = TenantDatabaseManager.get_session(db_name)
        try:
            admin_user = TenantUser(
                username=tenant_in.initial_admin_username or "admin",
                email=tenant_in.initial_admin_email or f"admin@{tenant_in.slug}.com",
                hashed_password=get_password_hash(tenant_in.initial_admin_password or "admin123"),
                role="admin",
                is_active=True
            )
            tenant_session.add(admin_user)
            tenant_session.commit()
        finally:
            tenant_session.close()

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Falha ao provisionar banco de dados dedicado para o cliente '{tenant_in.slug}': {str(e)}"
        )

    # 4. Register tenant in master DB
    tenant = Tenant(
        name=tenant_in.name,
        slug=tenant_in.slug,
        db_name=db_name,
        description=tenant_in.description,
        is_active=tenant_in.is_active
    )

    # If created by a regular manager, automatically assign to that manager
    if current_user.role != "superadmin":
        tenant.assigned_managers.append(current_user)

    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant

@router.get("/tenants/{tenant_id}", response_model=TenantResponse)
def get_tenant_detail(
    tenant_id: int,
    current_user: ManagerUser = Depends(get_current_manager_user),
    db: Session = Depends(get_master_db)
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    # RBAC check
    if current_user.role != "superadmin":
        allowed_ids = [t.id for t in current_user.assigned_tenants]
        if tenant.id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Você não tem permissão para visualizar este cliente.")

    return tenant

@router.put("/tenants/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: int,
    tenant_in: TenantUpdate,
    current_user: ManagerUser = Depends(get_current_manager_user),
    db: Session = Depends(get_master_db)
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    if current_user.role != "superadmin":
        allowed_ids = [t.id for t in current_user.assigned_tenants]
        if tenant.id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Você não tem permissão para editar este cliente.")

    if tenant_in.name is not None:
        tenant.name = tenant_in.name
    if tenant_in.description is not None:
        tenant.description = tenant_in.description
    if tenant_in.is_active is not None:
        tenant.is_active = tenant_in.is_active

    db.commit()
    db.refresh(tenant)
    return tenant

@router.post("/tenants/{tenant_id}/mcp-token")
def generate_tenant_mcp_token(
    tenant_id: int,
    current_user: ManagerUser = Depends(get_current_manager_user),
    db: Session = Depends(get_master_db)
):
    """
    Gera token de acesso de longa duração (365 dias) para agentes MCP.
    O token é estritamente vinculado ao banco de dados do hospital (tenant_slug)
    e somente pode ser gerado pelo Superadmin ou gestor autorizado da unidade.
    """
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Cliente/Unidade não encontrada.")

    # RBAC verification: Superadmin or assigned manager
    if current_user.role != "superadmin":
        allowed_ids = [t.id for t in current_user.assigned_tenants]
        if tenant.id not in allowed_ids:
            raise HTTPException(
                status_code=403,
                detail="Você não tem permissão para gerar token MCP para esta unidade hospitalar."
            )

    mcp_expires = timedelta(days=365)
    token_payload = {
        "sub": f"mcp_{tenant.slug}",
        "scope": "mcp",
        "tenant_slug": tenant.slug,
        "tenant_id": tenant.id,
        "generated_by": current_user.username
    }
    mcp_token = create_access_token(data=token_payload, expires_delta=mcp_expires)

    return {
        "tenant_id": tenant.id,
        "tenant_name": tenant.name,
        "tenant_slug": tenant.slug,
        "mcp_url": f"/mcp/sse?s={tenant.slug}",
        "mcp_token": mcp_token,
        "token_type": "bearer",
        "expires_in_days": 365
    }

@router.delete("/tenants/{tenant_id}")

def delete_tenant(
    tenant_id: int,
    drop_database: bool = True,
    current_user: ManagerUser = Depends(require_superadmin),
    db: Session = Depends(get_master_db)
):
    """
    Exclui o registro do cliente e opcionalmente exclui o banco de dados dedicado no PostgreSQL.
    Apenas Superadmin tem autorização para esta operação.
    """
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    db_name = tenant.db_name
    db.delete(tenant)
    db.commit()

    if drop_database:
        try:
            TenantDatabaseManager.drop_tenant_database(db_name)
        except Exception as e:
            return {
                "message": f"Cliente removido do cadastro, mas houve aviso ao remover banco '{db_name}': {str(e)}"
            }

    return {"message": f"Cliente e banco de dados '{db_name}' removidos com sucesso!"}

# ============================================================================
# Gestão de Usuários do Cliente (Pelos Gestores da Unidade)
# ============================================================================

def _verify_tenant_access(tenant_id: int, current_user: ManagerUser, db: Session) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    if current_user.role != "superadmin":
        allowed_ids = [t.id for t in current_user.assigned_tenants]
        if tenant.id not in allowed_ids:
            raise HTTPException(
                status_code=403,
                detail="Você não tem permissão para gerenciar os usuários deste cliente."
            )
    return tenant

@router.get("/tenants/{tenant_id}/users")
def list_tenant_users(
    tenant_id: int,
    current_user: ManagerUser = Depends(get_current_manager_user),
    db: Session = Depends(get_master_db)
):
    """
    Retorna os usuários cadastrados no banco de dados isolado deste cliente.
    """
    tenant = _verify_tenant_access(tenant_id, current_user, db)
    tenant_session = TenantDatabaseManager.get_session(tenant.db_name)
    try:
        users = tenant_session.query(TenantUser).all()
        return [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "role": u.role,
                "is_active": u.is_active
            }
            for u in users
        ]
    finally:
        tenant_session.close()

@router.post("/tenants/{tenant_id}/users", status_code=status.HTTP_201_CREATED)
def create_tenant_user(
    tenant_id: int,
    user_in: dict,
    current_user: ManagerUser = Depends(get_current_manager_user),
    db: Session = Depends(get_master_db)
):
    """
    Cria um novo usuário diretamente no banco de dados isolado deste cliente.
    """
    tenant = _verify_tenant_access(tenant_id, current_user, db)
    tenant_session = TenantDatabaseManager.get_session(tenant.db_name)
    try:
        username = user_in.get("username", "").strip()
        email = user_in.get("email", "").strip()
        password = user_in.get("password", "").strip()
        role = user_in.get("role", "user")

        if not username or not password or not email:
            raise HTTPException(status_code=400, detail="Usuário, email e senha são obrigatórios.")

        existing = tenant_session.query(TenantUser).filter(
            (TenantUser.username == username) | (TenantUser.email == email)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Nome de usuário ou email já cadastrado nesta unidade.")

        new_user = TenantUser(
            username=username,
            email=email,
            hashed_password=get_password_hash(password),
            role=role,
            is_active=user_in.get("is_active", True)
        )
        tenant_session.add(new_user)
        tenant_session.commit()
        tenant_session.refresh(new_user)

        return {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "role": new_user.role,
            "is_active": new_user.is_active
        }
    finally:
        tenant_session.close()

@router.put("/tenants/{tenant_id}/users/{user_id}")
def update_tenant_user(
    tenant_id: int,
    user_id: int,
    user_in: dict,
    current_user: ManagerUser = Depends(get_current_manager_user),
    db: Session = Depends(get_master_db)
):
    tenant = _verify_tenant_access(tenant_id, current_user, db)
    tenant_session = TenantDatabaseManager.get_session(tenant.db_name)
    try:
        user = tenant_session.query(TenantUser).filter(TenantUser.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado nesta unidade.")

        if "email" in user_in and user_in["email"]:
            user.email = user_in["email"].strip()
        if "role" in user_in and user_in["role"]:
            user.role = user_in["role"]
        if "is_active" in user_in:
            user.is_active = bool(user_in["is_active"])
        if "password" in user_in and user_in["password"]:
            user.hashed_password = get_password_hash(user_in["password"].strip())

        tenant_session.commit()
        tenant_session.refresh(user)

        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active
        }
    finally:
        tenant_session.close()

@router.delete("/tenants/{tenant_id}/users/{user_id}")
def delete_tenant_user(
    tenant_id: int,
    user_id: int,
    current_user: ManagerUser = Depends(get_current_manager_user),
    db: Session = Depends(get_master_db)
):
    tenant = _verify_tenant_access(tenant_id, current_user, db)
    tenant_session = TenantDatabaseManager.get_session(tenant.db_name)
    try:
        user = tenant_session.query(TenantUser).filter(TenantUser.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado nesta unidade.")

        tenant_session.delete(user)
        tenant_session.commit()
        return {"message": "Usuário excluído com sucesso da unidade."}
    finally:
        tenant_session.close()

# ============================================================================
# Gestão de Usuários Gerenciadores (Apenas Superadmin)
# ============================================================================


@router.get("/users", response_model=List[ManagerUserResponse])
def list_manager_users(
    current_user: ManagerUser = Depends(require_superadmin),
    db: Session = Depends(get_master_db)
):
    return db.query(ManagerUser).order_by(ManagerUser.id.desc()).all()

@router.post("/users", response_model=ManagerUserResponse, status_code=status.HTTP_201_CREATED)
def create_manager_user(
    user_in: ManagerUserCreate,
    current_user: ManagerUser = Depends(require_superadmin),
    db: Session = Depends(get_master_db)
):
    existing = db.query(ManagerUser).filter(
        (ManagerUser.username == user_in.username) | (ManagerUser.email == user_in.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Usuário ou email já cadastrado no gerenciador.")

    new_user = ManagerUser(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=user_in.is_active
    )

    if user_in.assigned_tenant_ids:
        tenants = db.query(Tenant).filter(Tenant.id.in_(user_in.assigned_tenant_ids)).all()
        new_user.assigned_tenants = tenants

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/users/{user_id}", response_model=ManagerUserResponse)
def update_manager_user(
    user_id: int,
    user_in: ManagerUserUpdate,
    current_user: ManagerUser = Depends(require_superadmin),
    db: Session = Depends(get_master_db)
):
    target_user = db.query(ManagerUser).filter(ManagerUser.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário gerenciador não encontrado.")

    if user_in.email is not None:
        target_user.email = user_in.email
    if user_in.role is not None:
        target_user.role = user_in.role
    if user_in.is_active is not None:
        target_user.is_active = user_in.is_active
    if user_in.password:
        target_user.hashed_password = get_password_hash(user_in.password)

    if user_in.assigned_tenant_ids is not None:
        tenants = db.query(Tenant).filter(Tenant.id.in_(user_in.assigned_tenant_ids)).all()
        target_user.assigned_tenants = tenants

    db.commit()
    db.refresh(target_user)
    return target_user

@router.delete("/users/{user_id}")
def delete_manager_user(
    user_id: int,
    current_user: ManagerUser = Depends(require_superadmin),
    db: Session = Depends(get_master_db)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Você não pode excluir seu próprio usuário gerenciador.")

    target_user = db.query(ManagerUser).filter(ManagerUser.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário gerenciador não encontrado.")

    db.delete(target_user)
    db.commit()
    return {"message": "Usuário gerenciador excluído com sucesso."}
