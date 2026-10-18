from sqlalchemy import Column, Integer, String, Boolean
from app.models.base import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String(50))  # admin, technician, user, solicitante
    full_name = Column(String(255), nullable=True)
    sector = Column(String(100), nullable=True)
    phone_extension = Column(String(50), nullable=True)
    requester_token = Column(String(64), unique=True, index=True, nullable=True)