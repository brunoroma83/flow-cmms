from pydantic import BaseModel, ConfigDict
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

    model_config = ConfigDict(from_attributes=True)