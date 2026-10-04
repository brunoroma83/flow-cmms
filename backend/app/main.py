import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api.endpoints import equipment, maintenance, dashboard, auth, reports, inventory, traceability
from app.core.config import settings
from app.db.session import engine
from app.models.base import Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Safely initialize DB tables and seed default admin user / sample data on app startup
    try:
        # Import init_db dynamically
        backend_dir = Path(__file__).parent.parent
        if str(backend_dir) not in sys.path:
            sys.path.insert(0, str(backend_dir))
        
        try:
            from init_db import init_db
            init_db()
        except ImportError:
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

# Include API REST routers
app.include_router(equipment.router, prefix="/api/equipment", tags=["equipment"])
app.include_router(maintenance.router, prefix="/api/maintenance", tags=["maintenance"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["inventory"])
app.include_router(traceability.router, prefix="/api/traceability", tags=["traceability"])

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Mount Static Files & Vanilla Web SPA Frontend
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")

@app.get("/")
def read_root():
    index_file = static_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "Flow CMMS API"}