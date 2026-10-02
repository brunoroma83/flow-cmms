from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class Equipment(Base):
    __tablename__ = "equipment"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    description = Column(Text)
    serial_number = Column(String(100), unique=True, index=True, nullable=False)
    anvisa_register = Column(String(100), nullable=True)
    equipment_type = Column(String(100), nullable=True)
    category_id = Column(Integer, default=1)
    status = Column(String(50), default="active")
    purchase_date = Column(DateTime, nullable=True)
    warranty_end = Column(DateTime, nullable=True)
    location = Column(String(255), nullable=True)
    manufacturer = Column(String(255), nullable=True)
    model = Column(String(255), nullable=True)
    specifications = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    maintenance_records = relationship("Maintenance", back_populates="equipment")
    traceability_records = relationship("TraceabilityRecord", back_populates="equipment")