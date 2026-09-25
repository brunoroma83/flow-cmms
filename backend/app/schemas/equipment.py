from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class EquipmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    serial_number: str
    category_id: Optional[int] = None
    status: str = "active"
    purchase_date: Optional[datetime] = None
    warranty_end: Optional[datetime] = None
    location: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    specifications: Optional[str] = None

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentUpdate(EquipmentBase):
    name: Optional[str] = None
    description: Optional[str] = None
    serial_number: Optional[str] = None
    category_id: Optional[int] = None
    status: Optional[str] = None
    purchase_date: Optional[datetime] = None
    warranty_end: Optional[datetime] = None
    location: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    specifications: Optional[str] = None

class Equipment(EquipmentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True