"""
Database Data Transfer Models and Helper Classes
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: str
    password: str
    name: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    avatar_color: str = "#6366f1"
    role: str = "user"
    is_admin: bool = False
    created_at: float
    document_ids: List[str] = []
    documents_count: int = 0
    query_count: int = 0
    plan: str = "free"
    plan_status: str = "active"
    plan_updated_at: Optional[float] = None
    offer_note: Optional[str] = None
    custom_doc_limit: Optional[int] = None
    custom_query_limit: Optional[int] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RegisterInitiateResponse(BaseModel):
    status: str = "otp_required"
    requires_otp: bool = True
    email: str
    name: str
    message: str
    delivery_provider: Optional[str] = None


class VerifyOTPRequest(BaseModel):
    email: str
    otp: str


class ResendOTPRequest(BaseModel):
    email: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token: str
    user: UserResponse
    db_engine: str


class AdminUserUpdateRole(BaseModel):
    role: str


class AdminUserUpdatePlan(BaseModel):
    plan: str
    plan_status: Optional[str] = "active"
    offer_note: Optional[str] = None
    custom_doc_limit: Optional[int] = None
    custom_query_limit: Optional[int] = None


class SystemSettingsUpdate(BaseModel):
    rate_limit_per_minute: Optional[int] = None
    plans: Optional[Dict[str, Any]] = None
    payment_gateway: Optional[Dict[str, Any]] = None
    ai_settings: Optional[Dict[str, Any]] = None

