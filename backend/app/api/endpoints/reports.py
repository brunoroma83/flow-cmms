from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.Report])
def read_reports(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    reports = db.query(models.Report).offset(skip).limit(limit).all()
    return reports

@router.post("/", response_model=schemas.Report)
def create_report(report: schemas.ReportCreate, db: Session = Depends(get_db)):
    db_report = models.Report(**report.model_dump())
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@router.get("/{report_id}", response_model=schemas.Report)
def read_report_id(report_id: int, db: Session = Depends(get_db)):
    db_report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if db_report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return db_report

@router.put("/{report_id}", response_model=schemas.Report)
def update_report(report_id: int, report: schemas.ReportUpdate, db: Session = Depends(get_db)):
    db_report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if db_report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    
    for key, value in report.model_dump(exclude_unset=True).items():
        setattr(db_report, key, value)
    
    db.commit()
    db.refresh(db_report)
    return db_report

@router.delete("/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    db_report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if db_report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    
    db.delete(db_report)
    db.commit()
    return {"message": "Report deleted successfully"}

@router.get("/maintenance-history/{equipment_id}")
def get_maintenance_history(equipment_id: int, db: Session = Depends(get_db)):
    history = db.query(models.Maintenance).filter(models.Maintenance.equipment_id == equipment_id).all()
    return history

@router.get("/inventory-report")
def get_inventory_report(db: Session = Depends(get_db)):
    # Get inventory data
    inventory_items = db.query(models.InventoryItem).all()
    
    # Calculate totals
    total_items = len(inventory_items)
    total_value = sum(item.price * item.quantity for item in inventory_items if item.price and item.quantity)
    
    return {
        "total_items": total_items,
        "total_value": total_value,
        "items": inventory_items
    }