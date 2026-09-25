from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app import models, schemas
from backend.app.database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.Maintenance])
def read_maintenance(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    maintenance = db.query(models.Maintenance).offset(skip).limit(limit).all()
    return maintenance

@router.post("/", response_model=schemas.Maintenance)
def create_maintenance(maintenance: schemas.MaintenanceCreate, db: Session = Depends(get_db)):
    db_maintenance = models.Maintenance(**maintenance.dict())
    db.add(db_maintenance)
    db.commit()
    db.refresh(db_maintenance)
    return db_maintenance

@router.get("/{maintenance_id}", response_model=schemas.Maintenance)
def read_maintenance_id(maintenance_id: int, db: Session = Depends(get_db)):
    db_maintenance = db.query(models.Maintenance).filter(models.Maintenance.id == maintenance_id).first()
    if db_maintenance is None:
        raise HTTPException(status_code=404, detail="Maintenance not found")
    return db_maintenance

@router.put("/{maintenance_id}", response_model=schemas.Maintenance)
def update_maintenance(maintenance_id: int, maintenance: schemas.MaintenanceUpdate, db: Session = Depends(get_db)):
    db_maintenance = db.query(models.Maintenance).filter(models.Maintenance.id == maintenance_id).first()
    if db_maintenance is None:
        raise HTTPException(status_code=404, detail="Maintenance not found")
    
    for key, value in maintenance.dict(exclude_unset=True).items():
        setattr(db_maintenance, key, value)
    
    db.commit()
    db.refresh(db_maintenance)
    return db_maintenance

@router.delete("/{maintenance_id}")
def delete_maintenance(maintenance_id: int, db: Session = Depends(get_db)):
    db_maintenance = db.query(models.Maintenance).filter(models.Maintenance.id == maintenance_id).first()
    if db_maintenance is None:
        raise HTTPException(status_code=404, detail="Maintenance not found")
    
    db.delete(db_maintenance)
    db.commit()
    return {"message": "Maintenance deleted successfully"}