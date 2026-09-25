from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...schemas.maintenance import MaintenanceCreate, MaintenanceUpdate, Maintenance
from ...db.session import get_db
from ...models.maintenance import MaintenanceRecord

router = APIRouter()

@router.post("/", response_model=Maintenance)
def create_maintenance(
    maintenance: MaintenanceCreate,
    db: Session = Depends(get_db)
):
    db_maintenance = MaintenanceRecord(**maintenance.dict())
    db.add(db_maintenance)
    db.commit()
    db.refresh(db_maintenance)
    return db_maintenance

@router.get("/{maintenance_id}", response_model=Maintenance)
def read_maintenance(
    maintenance_id: int,
    db: Session = Depends(get_db)
):
    db_maintenance = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == maintenance_id).first()
    if not db_maintenance:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    return db_maintenance

@router.get("/", response_model=list[Maintenance])
def read_maintenances(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    maintenances = db.query(MaintenanceRecord).offset(skip).limit(limit).all()
    return maintenances

@router.put("/{maintenance_id}", response_model=Maintenance)
def update_maintenance(
    maintenance_id: int,
    maintenance: MaintenanceUpdate,
    db: Session = Depends(get_db)
):
    db_maintenance = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == maintenance_id).first()
    if not db_maintenance:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    
    update_data = maintenance.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_maintenance, key, value)
    
    db.commit()
    db.refresh(db_maintenance)
    return db_maintenance

@router.delete("/{maintenance_id}")
def delete_maintenance(
    maintenance_id: int,
    db: Session = Depends(get_db)
):
    db_maintenance = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == maintenance_id).first()
    if not db_maintenance:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    
    db.delete(db_maintenance)
    db.commit()
    return {"message": "Maintenance record deleted successfully"}