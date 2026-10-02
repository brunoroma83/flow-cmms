from sqlalchemy import Column, Integer, String, DateTime, Float, Text
from datetime import datetime
from app.models.base import Base

class InventoryItem(Base):
    __tablename__ = "inventory_items"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    part_number = Column(String(100), unique=True, index=True)
    quantity = Column(Integer, default=0)
    min_quantity = Column(Integer, default=0)
    max_quantity = Column(Integer, default=0)
    unit_price = Column(Float)
    total_value = Column(Float)
    supplier = Column(String(255))
    category = Column(String(100))
    location = Column(String(255))
    last_updated = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)