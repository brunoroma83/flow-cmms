from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...schemas.asset import AssetCreate, AssetUpdate, Asset
from ...db.session import get_db
from ...models.asset import Asset as AssetModel

router = APIRouter()

@router.post("/", response_model=Asset)
def create_asset(
    asset: AssetCreate,
    db: Session = Depends(get_db)
):
    db_asset = AssetModel(**asset.dict())
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

@router.get("/{asset_id}", response_model=Asset)
def read_asset(
    asset_id: int,
    db: Session = Depends(get_db)
):
    db_asset = db.query(AssetModel).filter(AssetModel.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return db_asset

@router.get("/", response_model=list[Asset])
def read_assets(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    assets = db.query(AssetModel).offset(skip).limit(limit).all()
    return assets

@router.put("/{asset_id}", response_model=Asset)
def update_asset(
    asset_id: int,
    asset: AssetUpdate,
    db: Session = Depends(get_db)
):
    db_asset = db.query(AssetModel).filter(AssetModel.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    update_data = asset.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_asset, key, value)
    
    db.commit()
    db.refresh(db_asset)
    return db_asset

@router.delete("/{asset_id}")
def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db)
):
    db_asset = db.query(AssetModel).filter(AssetModel.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    db.delete(db_asset)
    db.commit()
    return {"message": "Asset deleted successfully"}