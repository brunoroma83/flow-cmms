from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...schemas.report import ReportData
from ...db.session import get_db
from ...models.asset import Asset
from ...models.maintenance import MaintenanceRecord
from datetime import datetime

router = APIRouter()

@router.get("/dashboard", response_model=ReportData)
def get_dashboard_data(
    db: Session = Depends(get_db)
):
    # Get total assets
    total_assets = db.query(Asset).count()
    
    # Get active assets
    active_assets = db.query(Asset).filter(Asset.status == "active").count()
    
    # Get maintenance records
    total_maintenances = db.query(MaintenanceRecord).count()
    
    # Get pending maintenances
    pending_maintenances = db.query(MaintenanceRecord).filter(MaintenanceRecord.status == "pending").count()
    
    # Calculate uptime (simplified - would need more complex logic in real implementation)
    uptime = 95.0  # percentage
    
    # Calculate MTTR (Mean Time To Repair) - simplified
    mttr = 4.5  # hours
    
    # Calculate MTBF (Mean Time Between Failures) - simplified  
    mtbf = 120.0  # hours
    
    return ReportData(
        total_assets=total_assets,
        active_assets=active_assets,
        total_maintenances=total_maintenances,
        pending_maintenances=pending_maintenances,
        uptime=uptime,
        mttr=mttr,
        mtbf=mtbf
    )

@router.get("/maintenance-history/{asset_id}")
def get_maintenance_history(
    asset_id: int,
    db: Session = Depends(get_db)
):
    history = db.query(MaintenanceRecord)\
        .filter(MaintenanceRecord.asset_id == asset_id)\
        .order_by(MaintenanceRecord.created_at.desc())\
        .all()
    
    return history

@router.get("/inventory-report")
def get_inventory_report(
    db: Session = Depends(get_db)
):
    from ...models.inventory import InventoryItem
    
    items = db.query(InventoryItem)\
        .filter(InventoryItem.is_active == True)\
        .order_by(InventoryItem.quantity.asc())\
        .all()
    
    return items

@router.get("/maintenance-summary")
def get_maintenance_summary(
    db: Session = Depends(get_db)
):
    # Get maintenance summary by type
    corrective_maintenances = db.query(MaintenanceRecord)\
        .filter(MaintenanceRecord.maintenance_type == "corrective")\
        .count()
    
    preventive_maintenances = db.query(MaintenanceRecord)\
        .filter(MaintenanceRecord.maintenance_type == "preventive")\
        .count()
    
    # Get status summary
    pending_maintenances = db.query(MaintenanceRecord)\
        .filter(MaintenanceRecord.status == "pending")\
        .count()
        
    in_progress_maintenances = db.query(MaintenanceRecord)\
        .filter(MaintenanceRecord.status == "in_progress")\
        .count()
        
    completed_maintenances = db.query(MaintenanceRecord)\
        .filter(MaintenanceRecord.status == "completed")\
        .count()
    
    return {
        "corrective_maintenances": corrective_maintenances,
        "preventive_maintenances": preventive_maintenances,
        "pending_maintenances": pending_maintenances,
        "in_progress_maintenances": in_progress_maintenances,
        "completed_maintenances": completed_maintenances
    }