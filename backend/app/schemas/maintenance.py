from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class MaintenanceBase(BaseModel):
    equipment_id: int
    type: str  # preventive, corrective
    description: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    actual_date: Optional[datetime] = None
    status: str = "pending"
    technician: Optional[str] = None
    cost: Optional[float] = None
    notes: Optional[str] = None

class MaintenanceCreate(MaintenanceBase):
    pass

class MaintenanceUpdate(MaintenanceBase):
    equipment_id: Optional[int] = None
    type: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    actual_date: Optional[datetime] = None
    status: Optional[str] = None
    technician: Optional[str] = None
    cost: Optional[float] = None
    notes: Optional[str] = None

class Maintenance(MaintenanceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True