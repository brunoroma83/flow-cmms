from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class MaintenanceBase(BaseModel):
    asset_id: int
    maintenance_type: str  # corrective, preventive
    description: Optional[str] = None
    status: Optional[str] = "pending"  # pending, in_progress, completed, cancelled
    scheduled_date: Optional[datetime] = None
    actual_start_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    technician: Optional[str] = None
    cost: Optional[int] = 0  # em centavos
    notes: Optional[str] = None

    # Campos específicos para manutenção preventiva
    frequency: Optional[str] = None  # daily, weekly, monthly, yearly
    next_scheduled_date: Optional[datetime] = None
    last_maintenance_date: Optional[datetime] = None
    completed_count: Optional[int] = 0
    is_recurring: Optional[bool] = False

class MaintenanceCreate(MaintenanceBase):
    pass

class MaintenanceUpdate(MaintenanceBase):
    pass

class Maintenance(MaintenanceBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True