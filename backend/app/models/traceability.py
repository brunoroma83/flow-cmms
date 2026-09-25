from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from .base import Base, TimestampMixin
from datetime import datetime

class TraceabilityRecord(Base, TimestampMixin):
    __tablename__ = "traceability_records"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    action = Column(String)  # maintenance, inventory_update, status_change
    description = Column(Text)
    related_document = Column(String)  # número da ordem de serviço, etc.
    user_id = Column(Integer, ForeignKey("users.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(Text)  # informações adicionais em JSON