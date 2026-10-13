from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime


# Tenant Schemas
class TenantBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    is_active: bool = True

class TenantCreate(TenantBase):
    initial_admin_username: Optional[str] = "admin"
    initial_admin_password: Optional[str] = "admin123"
    initial_admin_email: Optional[str] = "admin@cliente.com"

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class TenantResponse(TenantBase):
    id: int
    db_name: str
    created_at: datetime

    class Config:
        from_attributes = True

# Manager User Schemas
class ManagerUserBase(BaseModel):
    username: str
    email: str
    role: str = "manager"  # "superadmin" or "manager"
    is_active: bool = True

class ManagerUserCreate(ManagerUserBase):
    password: str
    assigned_tenant_ids: Optional[List[int]] = []

class ManagerUserUpdate(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    assigned_tenant_ids: Optional[List[int]] = None


class ManagerUserResponse(ManagerUserBase):
    id: int
    created_at: datetime
    assigned_tenants: List[TenantResponse] = []

    class Config:
        from_attributes = True

class ManagerLoginRequest(BaseModel):
    username: str
    password: str

class ManagerLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: ManagerUserResponse
