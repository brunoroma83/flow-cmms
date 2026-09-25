from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.models.base import Base

class Equipment(Base):
    __tablename__ = "equipment"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    description = Column(Text)
    serial_number = Column(String(100), unique=True, index=True, nullable=False)
    category_id = Column(Integer)
    status = Column(String(50), default="active")
    purchase_date = Column(DateTime)
    warranty_end = Column(DateTime)
    location = Column(String(255))
    manufacturer = Column(String(255))
    model = Column(String(255))
    specifications = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    maintenance_records = relationship("Maintenance", back_populates="equipment")
    traceability_records = relationship("TraceabilityRecord", back_populates="equipment")