from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...schemas.inventory import InventoryItemCreate, InventoryItemUpdate, InventoryItem
from ...db.session import get_db
from ...models.inventory import InventoryItem as InventoryModel

router = APIRouter()

@router.post("/", response_model=InventoryItem)
def create_inventory_item(
    item: InventoryItemCreate,
    db: Session = Depends(get_db)
):
    db_item = InventoryModel(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/{item_id}", response_model=InventoryItem)
def read_inventory_item(
    item_id: int,
    db: Session = Depends(get_db)
):
    db_item = db.query(InventoryModel).filter(InventoryModel.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return db_item

@router.get("/", response_model=list[InventoryItem])
def read_inventory_items(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    items = db.query(InventoryModel).offset(skip).limit(limit).all()
    return items

@router.put("/{item_id}", response_model=InventoryItem)
def update_inventory_item(
    item_id: int,
    item: InventoryItemUpdate,
    db: Session = Depends(get_db)
):
    db_item = db.query(InventoryModel).filter(InventoryModel.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    update_data = item.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
    
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{item_id}")
def delete_inventory_item(
    item_id: int,
    db: Session = Depends(get_db)
):
    db_item = db.query(InventoryModel).filter(InventoryModel.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    db.delete(db_item)
    db.commit()
    return {"message": "Inventory item deleted successfully"}