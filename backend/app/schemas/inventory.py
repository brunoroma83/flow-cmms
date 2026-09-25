from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class InventoryItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    part_number: str
    quantity: int = 0
    min_quantity: int = 0
    max_quantity: int = 0
    unit_price: Optional[float] = None
    total_value: Optional[float] = None
    supplier: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(InventoryItemBase):
    name: Optional[str] = None
    description: Optional[str] = None
    part_number: Optional[str] = None
    quantity: Optional[int] = None
    min_quantity: Optional[int] = None
    max_quantity: Optional[int] = None
    unit_price: Optional[float] = None
    total_value: Optional[float] = None
    supplier: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None

class InventoryItem(InventoryItemBase):
    id: int
    last_updated: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class StockAdjustment(BaseModel):
    adjustment_value: int