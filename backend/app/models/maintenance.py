from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.models.base import Base

class Maintenance(Base):
    __tablename__ = "maintenance"
    
    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False)
    type = Column(String(50))  # preventive, corrective
    description = Column(Text)
    scheduled_date = Column(DateTime)
    actual_date = Column(DateTime)
    status = Column(String(50))  # pending, in_progress, completed
    technician = Column(String(255))
    cost = Column(Float)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    equipment = relationship("Equipment", back_populates="maintenance_records")
    traceability_records = relationship("TraceabilityRecord", back_populates="maintenance")