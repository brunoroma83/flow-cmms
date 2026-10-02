from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List

class MaintenanceEntryBase(BaseModel):
    entry_type: str  # technical_assessment, technical_solution, parts_used, general_observation
    notes: str
    registered_by: Optional[str] = None

class MaintenanceEntryCreate(MaintenanceEntryBase):
    pass

class MaintenanceEntry(MaintenanceEntryBase):
    id: int
    maintenance_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MaintenanceBase(BaseModel):
    equipment_id: int
    type: str  # preventive, corrective
    description: Optional[str] = None
    opening_report: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    actual_date: Optional[datetime] = None
    start_time: Optional[datetime] = None
    completion_time: Optional[datetime] = None
    downtime_start: Optional[datetime] = None
    downtime_end: Optional[datetime] = None
    status: str = "pending"
    technician: Optional[str] = None
    cost: Optional[float] = 0.0
    notes: Optional[str] = None

class MaintenanceCreate(MaintenanceBase):
    pass

class MaintenanceUpdate(BaseModel):
    equipment_id: Optional[int] = None
    type: Optional[str] = None
    description: Optional[str] = None
    opening_report: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    actual_date: Optional[datetime] = None
    start_time: Optional[datetime] = None
    completion_time: Optional[datetime] = None
    downtime_start: Optional[datetime] = None
    downtime_end: Optional[datetime] = None
    status: Optional[str] = None
    technician: Optional[str] = None
    cost: Optional[float] = None
    notes: Optional[str] = None

class Maintenance(MaintenanceBase):
    id: int
    created_at: datetime
    updated_at: datetime
    entries: List[MaintenanceEntry] = []

    model_config = ConfigDict(from_attributes=True)