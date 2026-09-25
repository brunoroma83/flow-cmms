from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AssetBase(BaseModel):
    name: str
    description: Optional[str] = None
    serial_number: str
    model: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = "active"
    location: Optional[str] = None
    purchase_date: Optional[datetime] = None
    warranty_expiry: Optional[datetime] = None
    technical_specs: Optional[str] = None

class AssetCreate(AssetBase):
    pass

class AssetUpdate(AssetBase):
    pass

class Asset(AssetBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True