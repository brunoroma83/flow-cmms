from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.TraceabilityRecord])
def read_traceability_records(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    records = db.query(models.TraceabilityRecord).offset(skip).limit(limit).all()
    return records

@router.post("/", response_model=schemas.TraceabilityRecord)
def create_traceability_record(record: schemas.TraceabilityRecordCreate, db: Session = Depends(get_db)):
    db_record = models.TraceabilityRecord(**record.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

@router.get("/{record_id}", response_model=schemas.TraceabilityRecord)
def read_traceability_record(record_id: int, db: Session = Depends(get_db)):
    db_record = db.query(models.TraceabilityRecord).filter(models.TraceabilityRecord.id == record_id).first()
    if db_record is None:
        raise HTTPException(status_code=404, detail="Traceability record not found")
    return db_record

@router.put("/{record_id}", response_model=schemas.TraceabilityRecord)
def update_traceability_record(record_id: int, record: schemas.TraceabilityRecordUpdate, db: Session = Depends(get_db)):
    db_record = db.query(models.TraceabilityRecord).filter(models.TraceabilityRecord.id == record_id).first()
    if db_record is None:
        raise HTTPException(status_code=404, detail="Traceability record not found")
    
    for key, value in record.model_dump(exclude_unset=True).items():
        setattr(db_record, key, value)
    
    db.commit()
    db.refresh(db_record)
    return db_record

@router.delete("/{record_id}")
def delete_traceability_record(record_id: int, db: Session = Depends(get_db)):
    db_record = db.query(models.TraceabilityRecord).filter(models.TraceabilityRecord.id == record_id).first()
    if db_record is None:
        raise HTTPException(status_code=404, detail="Traceability record not found")
    
    db.delete(db_record)
    db.commit()
    return {"message": "Traceability record deleted successfully"}

@router.get("/equipment/{equipment_id}")
def get_equipment_traceability(equipment_id: int, db: Session = Depends(get_db)):
    records = db.query(models.TraceabilityRecord).filter(
        models.TraceabilityRecord.equipment_id == equipment_id
    ).order_by(models.TraceabilityRecord.created_at.desc()).all()
    
    return records

@router.get("/maintenance/{maintenance_id}")
def get_maintenance_traceability(maintenance_id: int, db: Session = Depends(get_db)):
    records = db.query(models.TraceabilityRecord).filter(
        models.TraceabilityRecord.maintenance_id == maintenance_id
    ).order_by(models.TraceabilityRecord.created_at.desc()).all()
    
    return records