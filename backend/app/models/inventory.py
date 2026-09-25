from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Numeric
from .base import Base, TimestampMixin
from datetime import datetime

class InventoryItem(Base, TimestampMixin):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    part_number = Column(String, unique=True, index=True)
    supplier = Column(String)
    quantity = Column(Integer, default=0)
    min_stock_level = Column(Integer, default=0)
    unit_price = Column(Numeric(precision=10, scale=2))  # em centavos
    total_value = Column(Numeric(precision=10, scale=2))
    location = Column(String)
    is_active = Column(Boolean, default=True)

class InventoryTransaction(Base, TimestampMixin):
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    transaction_type = Column(String)  # in, out, adjustment
    quantity = Column(Integer)
    reference_number = Column(String)  # ordem de serviço, etc.
    notes = Column(Text)