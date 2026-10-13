from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

# Association table for ManagerUser <-> Tenant (many-to-many)
manager_tenant_association = Table(
    "manager_tenant_assignments",
    Base.metadata,
    Column("manager_user_id", Integer, ForeignKey("manager_users.id", ondelete="CASCADE"), primary_key=True),
    Column("tenant_id", Integer, ForeignKey("tenants.id", ondelete="CASCADE"), primary_key=True),
    Column("created_at", DateTime, default=datetime.utcnow)
)

class ManagerUser(Base):
    __tablename__ = "manager_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    # role: 'superadmin' (platform admin - views/manages all tenants) or 'manager' (views only assigned tenants)
    role = Column(String(50), default="manager", nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Assigned tenants that this manager has permission to see and operate
    assigned_tenants = relationship(
        "Tenant",
        secondary=manager_tenant_association,
        back_populates="assigned_managers"
    )

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    db_name = Column(String(120), unique=True, nullable=False)
    description = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    assigned_managers = relationship(
        "ManagerUser",
        secondary=manager_tenant_association,
        back_populates="assigned_tenants"
    )
