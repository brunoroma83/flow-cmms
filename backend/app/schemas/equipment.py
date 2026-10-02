from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class EquipmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    serial_number: str
    anvisa_register: Optional[str] = None
    equipment_type: Optional[str] = None
    category_id: Optional[int] = 1
    status: str = "active"
    purchase_date: Optional[datetime] = None
    warranty_end: Optional[datetime] = None
    location: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    specifications: Optional[str] = None

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    serial_number: Optional[str] = None
    anvisa_register: Optional[str] = None
    equipment_type: Optional[str] = None
    category_id: Optional[int] = None
    status: Optional[str] = None
    purchase_date: Optional[datetime] = None
    warranty_end: Optional[datetime] = None
    location: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    specifications: Optional[str] = None
    is_deleted: Optional[bool] = None

class Equipment(EquipmentBase):
    id: int
    is_deleted: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)