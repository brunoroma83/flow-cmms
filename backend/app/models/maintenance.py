from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class Maintenance(Base):
    __tablename__ = "maintenance"
    
    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False)
    type = Column(String(50))  # preventive, corrective
    description = Column(Text, nullable=True)
    opening_report = Column(Text, nullable=True)
    scheduled_date = Column(DateTime, nullable=True)
    actual_date = Column(DateTime, nullable=True)
    start_time = Column(DateTime, nullable=True)
    completion_time = Column(DateTime, nullable=True)
    downtime_start = Column(DateTime, nullable=True)
    downtime_end = Column(DateTime, nullable=True)
    status = Column(String(50), default="pending")  # pending, in_progress, completed, cancelled
    technician = Column(String(255), nullable=True)
    cost = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    equipment = relationship("Equipment", back_populates="maintenance_records")
    traceability_records = relationship("TraceabilityRecord", back_populates="maintenance")
    entries = relationship("MaintenanceEntry", back_populates="maintenance", cascade="all, delete-orphan", order_by="MaintenanceEntry.created_at.asc()")

class MaintenanceEntry(Base):
    __tablename__ = "maintenance_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    maintenance_id = Column(Integer, ForeignKey("maintenance.id"), nullable=False)
    entry_type = Column(String(100), nullable=False)  # technical_assessment, technical_solution, parts_used, general_observation
    notes = Column(Text, nullable=False)
    registered_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    maintenance = relationship("Maintenance", back_populates="entries")