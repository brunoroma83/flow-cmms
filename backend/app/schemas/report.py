from pydantic import BaseModel
from typing import Optional

class ReportData(BaseModel):
    total_assets: int
    active_assets: int
    total_maintenances: int
    pending_maintenances: int
    uptime: float  # percentage
    mttr: float   # hours
    mtbf: float   # hours
    
    class Config:
        from_attributes = True