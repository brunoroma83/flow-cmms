from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Enum
from .base import Base, TimestampMixin
from datetime import datetime

class Asset(Base, TimestampMixin):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    serial_number = Column(String, unique=True, index=True)
    model = Column(String)
    brand = Column(String)
    category = Column(String)
    status = Column(String, default="active")  # active, maintenance, inactive
    location = Column(String)
    purchase_date = Column(DateTime)
    warranty_expiry = Column(DateTime)
    technical_specs = Column(Text)
    is_active = Column(Boolean, default=True)