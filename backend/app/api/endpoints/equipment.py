from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app import models, schemas
from backend.app.database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.Equipment])
def read_equipment(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    equipment = db.query(models.Equipment).offset(skip).limit(limit).all()
    return equipment

@router.post("/", response_model=schemas.Equipment)
def create_equipment(equipment: schemas.EquipmentCreate, db: Session = Depends(get_db)):
    db_equipment = models.Equipment(**equipment.dict())
    db.add(db_equipment)
    db.commit()
    db.refresh(db_equipment)
    return db_equipment

@router.get("/{equipment_id}", response_model=schemas.Equipment)
def read_equipment_id(equipment_id: int, db: Session = Depends(get_db)):
    db_equipment = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
    if db_equipment is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return db_equipment

@router.put("/{equipment_id}", response_model=schemas.Equipment)
def update_equipment(equipment_id: int, equipment: schemas.EquipmentUpdate, db: Session = Depends(get_db)):
    db_equipment = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
    if db_equipment is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    for key, value in equipment.dict(exclude_unset=True).items():
        setattr(db_equipment, key, value)
    
    db.commit()
    db.refresh(db_equipment)
    return db_equipment

@router.delete("/{equipment_id}")
def delete_equipment(equipment_id: int, db: Session = Depends(get_db)):
    db_equipment = db.query(models.Equipment).filter(models.Equipment.id == equipment_id).first()
    if db_equipment is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    db.delete(db_equipment)
    db.commit()
    return {"message": "Equipment deleted successfully"}