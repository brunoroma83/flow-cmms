from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Flow CMMS - Medical Equipment Management System"
    DATABASE_URL: str = "postgresql://cmms_user:cmms_password@db:5432/flow_cmms"
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALLOWED_ORIGINS: List[str] = ["*"]
    
    # AI Integration Settings
    AI_PROVIDER: str = "gemini"  # gemini, openai, lmstudio, ollama
    AI_API_KEY: str = ""
    
    # Telegram Settings
    TELEGRAM_BOT_TOKEN: str = ""
    
    class Config:
        env_file = ".env"

settings = Settings()