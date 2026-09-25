from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from decimal import Decimal

class InventoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    part_number: str
    supplier: Optional[str] = None
    quantity: int = 0
    min_stock_level: int = 0
    unit_price: Optional[Decimal] = None
    total_value: Optional[Decimal] = None
    location: Optional[str] = None

class InventoryItemCreate(InventoryBase):
    pass

class InventoryItemUpdate(InventoryBase):
    pass

class InventoryItem(InventoryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True