import os
from typing import Optional, Generator
from fastapi import Request, Header, HTTPException, status
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.models.base import Base
from app.db.tenant_manager import TenantDatabaseManager

# Master Engine & Session (Connects to central flow_cmms_db or master DB)
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_master_db() -> Generator[Session, None, None]:
    """
    Dependency that always yields a session connected to the Master / Platform database.
    Used for Tenant management, Manager users and permissions.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db(
    request: Request = None,
    x_tenant_slug: Optional[str] = Header(None, alias="X-Tenant-ID")
) -> Generator[Session, None, None]:
    """
    Multi-tenant aware DB session dependency.
    If 'X-Tenant-ID' header is provided, resolves the tenant database.
    If not provided (or for backwards compatibility / local dev tests), falls back to default database.
    """
    tenant_slug = x_tenant_slug
    # Check if request has tenant_slug set by middleware, query param, or scoped MCP token
    if request:
        if not tenant_slug:
            tenant_slug = request.headers.get("X-Tenant-ID") or request.headers.get("x-tenant-id")
        if not tenant_slug:
            tenant_slug = request.query_params.get("tenant_id") or request.query_params.get("tenant")
        if not tenant_slug:
            # Check if Authorization bearer token contains tenant_slug (e.g. MCP Token)
            auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
            if auth_header and auth_header.startswith("Bearer "):
                raw_jwt = auth_header.split(" ", 1)[1].strip()
                from app.auth.security import decode_token
                payload = decode_token(raw_jwt)
                if payload and payload.get("tenant_slug"):
                    tenant_slug = payload.get("tenant_slug")


    if tenant_slug:
        # Verify tenant exists and get db_name
        master_db = SessionLocal()
        try:
            from app.models.master import Tenant
            tenant = master_db.query(Tenant).filter(Tenant.slug == tenant_slug).first()
            if not tenant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Cliente/Tenant '{tenant_slug}' não encontrado."
                )
            if not tenant.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"O cliente '{tenant.name}' está inativo no momento."
                )
            db_name = tenant.db_name
        finally:
            master_db.close()

        tenant_db = TenantDatabaseManager.get_session(db_name)
        try:
            yield tenant_db
        finally:
            tenant_db.close()
    else:
        # Default session (useful during tests or single tenant dev fallback)
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()