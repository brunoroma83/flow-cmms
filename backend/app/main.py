from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import equipment, maintenance, dashboard, auth, reports, inventory, traceability
from app.core.config import settings
from app.db.session import engine
from app.models.base import Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Safely initialize DB tables on app startup
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"⚠️ Warning: Database initialization on startup encountered an issue: {e}")
    yield

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

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