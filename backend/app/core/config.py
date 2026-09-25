from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Flow CMMS"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/cmms_db"
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    LM_STUDIO_API_URL: Optional[str] = "http://localhost:1234/v1"
    OLLAMA_API_URL: Optional[str] = "http://localhost:11434/api"
    
    # Configurações adicionais para o sistema
    MAX_INVENTORY_ALERTS: int = 5
    
    class Config:
        case_sensitive = True

settings = Settings()