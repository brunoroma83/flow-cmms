from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional
from app import models, schemas
from app.database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.Maintenance])
def read_maintenance(
    skip: int = 0,
    limit: int = 100,
    equipment_id: Optional[int] = None,
    requester_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Maintenance)
    if equipment_id:
        query = query.filter(models.Maintenance.equipment_id == equipment_id)
    if requester_name:
        clean_req = requester_name.strip().lower()
        query = query.filter(
            or_(
                func.lower(models.Maintenance.requester_name) == clean_req,
                func.lower(models.Maintenance.requester_name).ilike(f"%{clean_req}%")
            )
        )
    maintenance = query.order_by(models.Maintenance.created_at.desc()).offset(skip).limit(limit).all()
    return maintenance

@router.post("/requester-ticket", response_model=schemas.Maintenance)
def create_requester_ticket(ticket: schemas.RequesterTicketCreate, db: Session = Depends(get_db)):
    """
    Endpoint dedicado para abertura rápida de chamados pelo solicitante.
    """
    # Verificar se o equipamento existe
    equipment = db.query(models.Equipment).filter(models.Equipment.id == ticket.equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipamento selecionado não foi encontrado.")

    # Busca usuário no banco para complementar ou enriquecer nome completo, setor e ramal
    user = db.query(models.User).filter(
        func.lower(models.User.username) == ticket.requester_name.strip().lower()
    ).first()

    if user and user.full_name:
        requester_display = f"{user.full_name} ({user.username})"
    else:
        requester_display = ticket.requester_name.strip()

    requester_sector = (
        ticket.requester_sector.strip() if ticket.requester_sector
        else (user.sector if user and user.sector else equipment.location)
    )
    requester_contact = (
        ticket.requester_contact.strip() if ticket.requester_contact
        else (user.phone_extension if user and user.phone_extension else None)
    )

    db_maintenance = models.Maintenance(
        equipment_id=ticket.equipment_id,
        type="corrective",
        description=ticket.description.strip(),
        opening_report=ticket.description.strip(),
        status="pending",
        requester_name=requester_display,
        requester_sector=requester_sector,
        requester_contact=requester_contact,
        urgency=ticket.urgency or "medium",
        cost=0.0
    )
    db.add(db_maintenance)
    db.commit()
    db.refresh(db_maintenance)
    return db_maintenance


@router.post("/", response_model=schemas.Maintenance)
def create_maintenance(maintenance: schemas.MaintenanceCreate, db: Session = Depends(get_db)):
    db_maintenance = models.Maintenance(**maintenance.model_dump())
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
    
    for key, value in maintenance.model_dump(exclude_unset=True).items():
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

# ------------------------------------------------------------------
# Endpoints for 1:N Complementary Technical Entries (MaintenanceEntry)
# ------------------------------------------------------------------

@router.post("/{maintenance_id}/entries", response_model=schemas.MaintenanceEntry)
def add_maintenance_entry(
    maintenance_id: int,
    entry: schemas.MaintenanceEntryCreate,
    db: Session = Depends(get_db)
):
    db_maintenance = db.query(models.Maintenance).filter(models.Maintenance.id == maintenance_id).first()
    if db_maintenance is None:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    
    db_entry = models.MaintenanceEntry(
        maintenance_id=maintenance_id,
        **entry.model_dump()
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.get("/{maintenance_id}/entries", response_model=List[schemas.MaintenanceEntry])
def get_maintenance_entries(maintenance_id: int, db: Session = Depends(get_db)):
    db_maintenance = db.query(models.Maintenance).filter(models.Maintenance.id == maintenance_id).first()
    if db_maintenance is None:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    
    return db_maintenance.entries