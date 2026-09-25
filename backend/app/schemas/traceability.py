from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class TraceabilityRecordBase(BaseModel):
    equipment_id: Optional[int] = None
    maintenance_id: Optional[int] = None
    action: str
    description: Optional[str] = None
    performed_by: Optional[str] = None
    related_document: Optional[str] = None

class TraceabilityRecordCreate(TraceabilityRecordBase):
    pass

class TraceabilityRecordUpdate(TraceabilityRecordBase):
    equipment_id: Optional[int] = None
    maintenance_id: Optional[int] = None
    action: Optional[str] = None
    description: Optional[str] = None
    performed_by: Optional[str] = None
    related_document: Optional[str] = None

class TraceabilityRecord(TraceabilityRecordBase):
    id: int
    timestamp: datetime
    created_at: datetime

    class Config:
        from_attributes = True