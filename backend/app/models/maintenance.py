from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Enum
from .base import Base, TimestampMixin
from datetime import datetime

class MaintenanceRecord(Base, TimestampMixin):
    __tablename__ = "maintenance_records"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    maintenance_type = Column(String)  # corrective, preventive
    description = Column(Text)
    status = Column(String, default="pending")  # pending, in_progress, completed, cancelled
    scheduled_date = Column(DateTime)
    actual_start_date = Column(DateTime)
    actual_end_date = Column(DateTime)
    technician = Column(String)
    cost = Column(Integer)  # em centavos
    notes = Column(Text)
    
    # Campos específicos para manutenção preventiva
    frequency = Column(String)  # daily, weekly, monthly, yearly
    next_scheduled_date = Column(DateTime)
    last_maintenance_date = Column(DateTime)
    completed_count = Column(Integer, default=0)
    is_recurring = Column(Boolean, default=False)