from fastapi import FastAPI
from .core.config import settings
from .api import api_router
from .db.session import engine
from .models import Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Include routers
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"message": "Sistema de Gerenciamento de Equipamentos Médicos"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/ready")
async def ready_check():
    return {"status": "ready"}