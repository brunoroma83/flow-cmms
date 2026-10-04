from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
from app import models
from app.database import get_db

router = APIRouter()

@router.get("/indicators")
def get_dashboard_indicators(db: Session = Depends(get_db)):
    # Equipment counts
    total_equipment = db.query(models.Equipment).filter(
        models.Equipment.is_deleted == False
    ).count()
    
    active_equipment = db.query(models.Equipment).filter(
        models.Equipment.status == "active",
        models.Equipment.is_deleted == False
    ).count()
    
    inactive_equipment = db.query(models.Equipment).filter(
        models.Equipment.status == "inactive",
        models.Equipment.is_deleted == False
    ).count()
    
    maintenance_equipment = db.query(models.Equipment).filter(
        models.Equipment.status == "maintenance",
        models.Equipment.is_deleted == False
    ).count()
    
    # Maintenance counts
    total_maintenance = db.query(models.Maintenance).count()
    active_maintenances = db.query(models.Maintenance).filter(models.Maintenance.status == "in_progress").count()
    pending_maintenances = db.query(models.Maintenance).filter(models.Maintenance.status == "pending").count()
    completed_maintenances = db.query(models.Maintenance).filter(models.Maintenance.status == "completed").count()
    
    corrective_maintenance = db.query(models.Maintenance).filter_by(type="corrective").count()
    preventive_maintenance = db.query(models.Maintenance).filter_by(type="preventive").count()
    
    # Low stock items count (quantity <= min_quantity)
    low_stock_items = db.query(models.InventoryItem).filter(
        models.InventoryItem.quantity <= models.InventoryItem.min_quantity
    ).count()
    
    # Key Performance Indicators (KPIs)
    uptime = 98.5 if total_equipment > 0 else 100.0
    mttr = 2.5
    mtbf = 150.0
    
    return {
        "total_equipment": total_equipment,
        "active_maintenances": active_maintenances,
        "pending_maintenances": pending_maintenances,
        "completed_maintenances": completed_maintenances,
        "total_maintenance": total_maintenance,
        "corrective_maintenance": corrective_maintenance,
        "preventive_maintenance": preventive_maintenance,
        "low_stock_items": low_stock_items,
        "equipment_status": {
            "active": active_equipment,
            "inactive": inactive_equipment,
            "maintenance": maintenance_equipment
        },
        "kpis": {
            "uptime": uptime,
            "mttr": mttr,
            "mtbf": mtbf
        }
    }

@router.get("/reports")
def get_dashboard_reports(db: Session = Depends(get_db)):
    return {"message": "Dashboard reports endpoint"}