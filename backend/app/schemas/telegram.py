from pydantic import BaseModel
from typing import Optional

class TelegramMessage(BaseModel):
    chat_id: str
    text: str
    message_id: Optional[str] = None

class TelegramResponse(BaseModel):
    success: bool
    message: str
    chat_id: str
    
    class Config:
        from_attributes = True