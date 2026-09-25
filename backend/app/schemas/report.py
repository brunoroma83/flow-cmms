from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ReportBase(BaseModel):
    title: str
    description: Optional[str] = None
    report_type: str
    generated_by: str
    file_path: Optional[str] = None

class ReportCreate(ReportBase):
    pass

class ReportUpdate(ReportBase):
    title: Optional[str] = None
    description: Optional[str] = None
    report_type: Optional[str] = None
    generated_by: Optional[str] = None
    file_path: Optional[str] = None

class Report(ReportBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True