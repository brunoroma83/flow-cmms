from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.models.base import Base

class TraceabilityRecord(Base):
    __tablename__ = "traceability_records"
    
    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"))
    maintenance_id = Column(Integer, ForeignKey("maintenance.id"))
    action = Column(String(255))  # e.g., "maintenance_completed", "inspection_performed"
    description = Column(Text)
    performed_by = Column(String(255))
    timestamp = Column(DateTime, default=datetime.utcnow)
    related_document = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    equipment = relationship("Equipment", back_populates="traceability_records")
    maintenance = relationship("Maintenance", back_populates="traceability_records")