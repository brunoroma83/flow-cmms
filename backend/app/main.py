from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.endpoints import equipment, maintenance, dashboard, auth, reports, inventory, traceability
from backend.app.core.config import settings
from backend.app.db.session import engine
from backend.app.models.base import Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(equipment.router, prefix="/api/equipment", tags=["equipment"])
app.include_router(maintenance.router, prefix="/api/maintenance", tags=["maintenance"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["inventory"])
app.include_router(traceability.router, prefix="/api/traceability", tags=["traceability"])

@app.get("/")
def read_root():
    return {"message": "Medical Equipment Management System API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}