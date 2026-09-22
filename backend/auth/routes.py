"""
User Authentication API Routes (Register, Login, Profile)
Unified across MongoDB Atlas, Neon PostgreSQL & SQLite
"""

import time
import uuid
import secrets
from fastapi import APIRouter, HTTPException, Depends
from backend.db.database import db_manager
from backend.db.models import (
    UserCreate,
    UserLogin,
    UserResponse,
    AuthResponse,
    RefreshTokenRequest,
    RegisterInitiateResponse,
    VerifyOTPRequest,
    ResendOTPRequest,
)
from backend.auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    get_current_user,
)
from backend.services.email_service import email_service

auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])

AVATAR_COLORS = [
    "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#3b82f6",
    "#06b6d4", "#10b981", "#f59e0b", "#f97316"
]


@auth_router.post("/register", response_model=RegisterInitiateResponse)
def register(req: UserCreate):
    email = req.email.strip().lower()
    name = req.name.strip()
    password = req.password

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
    if not name:
        name = email.split("@")[0].capitalize()

    # Check if user already exists
    existing = db_manager.get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please log in.")

    # Generate 6-digit OTP code
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    hashed_pwd = hash_password(password)
    avatar_color = secrets.choice(AVATAR_COLORS)
    created_at = time.time()
    expires_at = created_at + 600.0  # 10 minutes validity

    # Persist pending registration in database
    db_manager.save_pending_registration(
        email=email,
        name=name,
        hashed_password=hashed_pwd,
        avatar_color=avatar_color,
        otp=otp_code,
        expires_at=expires_at,
        created_at=created_at,
    )

    # Dispatch email (Gmail SMTP -> Brevo API -> Dev Console Fallback)
    email_result = email_service.send_otp_email(
        recipient_email=email,
        recipient_name=name,
        otp_code=otp_code,
    )

    provider_name = email_result.get("provider", "Email Service")

    return RegisterInitiateResponse(
        status="otp_required",
        requires_otp=True,
        email=email,
        name=name,
        message=f"A 6-digit verification code has been sent to {email}.",
        delivery_provider=provider_name,
    )


@auth_router.post("/verify-otp", response_model=AuthResponse)
def verify_otp(req: VerifyOTPRequest):
    email = req.email.strip().lower()
    user_otp = req.otp.strip()

    if not email or not user_otp:
        raise HTTPException(status_code=400, detail="Email and 6-digit verification code are required.")

    pending = db_manager.get_pending_registration(email)
    if not pending:
        # Check if already verified user
        existing_user = db_manager.get_user_by_email(email)
        if existing_user:
            raise HTTPException(status_code=400, detail="This account is already verified. Please sign in.")
        raise HTTPException(status_code=400, detail="No pending registration found or code expired. Please register again.")

    # Check expiration
    if time.time() > pending["expires_at"]:
        raise HTTPException(status_code=400, detail="Verification code has expired. Please click 'Resend Code'.")

    # Validate OTP
    if pending["otp"] != user_otp:
        raise HTTPException(status_code=400, detail="Incorrect verification code. Please check your inbox or spam folder.")

    # Create the verified user
    user_id = str(uuid.uuid4())
    created_at = time.time()
    db_manager.create_user(
        user_id=user_id,
        email=pending["email"],
        name=pending["name"],
        hashed_password=pending["hashed_password"],
        avatar_color=pending["avatar_color"],
        created_at=created_at,
    )

    # Clean up pending record
    db_manager.delete_pending_registration(email)

    # Issue JWT tokens
    access_token = create_access_token(user_id=user_id, email=pending["email"], name=pending["name"])
    refresh_token = create_refresh_token(user_id=user_id, email=pending["email"], name=pending["name"])

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token=access_token,
        user=UserResponse(
            id=user_id,
            email=pending["email"],
            name=pending["name"],
            avatar_color=pending["avatar_color"],
            created_at=created_at,
            document_ids=[],
            documents_count=0,
            plan="free",
            plan_status="active",
            plan_updated_at=None,
        ),
        db_engine=db_manager.db_type,
    )


@auth_router.post("/resend-otp")
def resend_otp(req: ResendOTPRequest):
    email = req.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Please provide an email address.")

    pending = db_manager.get_pending_registration(email)
    if not pending:
        existing = db_manager.get_user_by_email(email)
        if existing:
            raise HTTPException(status_code=400, detail="This account is already verified. Please sign in.")
        raise HTTPException(status_code=404, detail="No pending registration found for this email. Please sign up first.")

    # Generate new 6-digit OTP
    new_otp = f"{secrets.randbelow(900000) + 100000}"
    new_expires_at = time.time() + 600.0  # 10 minutes

    db_manager.update_pending_otp(email=email, otp=new_otp, expires_at=new_expires_at)

    # Send new email
    email_result = email_service.send_otp_email(
        recipient_email=email,
        recipient_name=pending["name"],
        otp_code=new_otp,
    )

    return {
        "status": "success",
        "message": f"A fresh verification code has been dispatched to {email}.",
        "delivery_provider": email_result.get("provider", "Email Service"),
    }


@auth_router.post("/login", response_model=AuthResponse)
def login(req: UserLogin):
    email = req.email.strip().lower()
    password = req.password

    user = db_manager.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not verify_password(password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    access_token = create_access_token(user_id=user["id"], email=user["email"], name=user["name"])
    refresh_token = create_refresh_token(user_id=user["id"], email=user["email"], name=user["name"])
    doc_ids = user.get("document_ids", [])

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token=access_token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            avatar_color=user.get("avatar_color", "#6366f1"),
            created_at=user["created_at"],
            document_ids=doc_ids,
            documents_count=len(doc_ids),
            plan=user.get("plan", "free"),
            plan_status=user.get("plan_status", "active"),
            plan_updated_at=user.get("plan_updated_at"),
        ),
        db_engine=db_manager.db_type,
    )


@auth_router.post("/refresh", response_model=AuthResponse)
def refresh_token(req: RefreshTokenRequest):
    payload = decode_refresh_token(req.refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token. Please sign in again.")

    user_id = payload.get("sub")
    user = db_manager.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User account no longer exists.")

    new_access_token = create_access_token(user_id=user["id"], email=user["email"], name=user["name"])
    new_refresh_token = create_refresh_token(user_id=user["id"], email=user["email"], name=user["name"])
    doc_ids = user.get("document_ids", [])

    return AuthResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token=new_access_token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            avatar_color=user.get("avatar_color", "#6366f1"),
            created_at=user["created_at"],
            document_ids=doc_ids,
            documents_count=len(doc_ids),
            plan=user.get("plan", "free"),
            plan_status=user.get("plan_status", "active"),
            plan_updated_at=user.get("plan_updated_at"),
        ),
        db_engine=db_manager.db_type,
    )


@auth_router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    user = db_manager.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    doc_ids = user.get("document_ids", [])
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        avatar_color=user.get("avatar_color", "#6366f1"),
        created_at=user["created_at"],
        document_ids=doc_ids,
        documents_count=len(doc_ids),
        plan=user.get("plan", "free"),
        plan_status=user.get("plan_status", "active"),
        plan_updated_at=user.get("plan_updated_at"),
    )
