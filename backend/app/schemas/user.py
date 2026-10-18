from pydantic import BaseModel, ConfigDict
from typing import Optional

class UserBase(BaseModel):
    username: str
    email: str
    role: str = "user"
    full_name: Optional[str] = None
    sector: Optional[str] = None
    phone_extension: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    full_name: Optional[str] = None
    sector: Optional[str] = None
    phone_extension: Optional[str] = None
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class LoginForm(BaseModel):
    username: str
    password: str

class RequesterLoginRequest(BaseModel):
    username: str
    full_name: Optional[str] = None
    sector: Optional[str] = None
    contact: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginResponse(BaseModel):
    user: User
    token: Token

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class MCPTokenResponse(BaseModel):
    mcp_url: str
    mcp_token: str
    token_type: str = "bearer"
    expires_in_days: int = 365