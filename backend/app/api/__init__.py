from fastapi import APIRouter
from .endpoints import assets, maintenance, inventory, users, ai, telegram, reports

api_router = APIRouter()

api_router.include_router(assets.router, prefix="/assets", tags=["assets"])
api_router.include_router(maintenance.router, prefix="/maintenance", tags=["maintenance"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(telegram.router, prefix="/telegram", tags=["telegram"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])