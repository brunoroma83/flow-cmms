from pydantic import BaseModel, ConfigDict
from typing import Optional

class TelegramMessage(BaseModel):
    chat_id: str
    text: str
    message_id: Optional[str] = None

class TelegramResponse(BaseModel):
    success: bool
    message: str
    chat_id: str
    
    model_config = ConfigDict(from_attributes=True)