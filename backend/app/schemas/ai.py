from pydantic import BaseModel, ConfigDict
from typing import Optional

class AIRequest(BaseModel):
    prompt: str
    provider: Optional[str] = "openai"  # openai, gemini, lmstudio, ollama
    model: Optional[str] = None
    temperature: Optional[float] = 0.7

class AIResponse(BaseModel):
    response: str
    provider: str
    prompt: str
    
    model_config = ConfigDict(from_attributes=True)