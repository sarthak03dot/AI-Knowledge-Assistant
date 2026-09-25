"""
Security, Password Hashing and JWT Token Management
"""

import os
import time
import hmac
import hashlib
import base64
import json
import secrets
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, Depends

SECRET_KEY = os.getenv("JWT_SECRET_KEY") or "nexus-rag-production-secret-key-2026-secure"
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_SECONDS = 60 * 60 * 24  # 24 Hours
REFRESH_TOKEN_EXPIRE_SECONDS = 60 * 60 * 24 * 30  # 30 Days


def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with a random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000,
    )
    return f"{salt}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against stored salt and hash."""
    try:
        salt, expected_hex = hashed_password.split("$", 1)
        actual_key = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            100000,
        )
        return hmac.compare_digest(actual_key.hex(), expected_hex)
    except Exception:
        return False


def _create_token(payload_dict: Dict[str, Any], expire_seconds: int) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        **payload_dict,
        "jti": secrets.token_hex(8),
        "iat": int(time.time()),
        "exp": int(time.time()) + expire_seconds,
    }

    def b64url(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

    header_b64 = b64url(json.dumps(header).encode("utf-8"))
    payload_b64 = b64url(json.dumps(payload).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")

    signature = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = b64url(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def create_access_token(user_id: str, email: str, name: str, role: str = "user", is_admin: bool = False) -> str:
    """Create a signed JWT access token (24h)."""
    return _create_token({
        "sub": user_id,
        "email": email,
        "name": name,
        "role": role,
        "is_admin": is_admin,
        "token_type": "access",
    }, ACCESS_TOKEN_EXPIRE_SECONDS)


def create_refresh_token(user_id: str, email: str, name: str, role: str = "user", is_admin: bool = False) -> str:
    """Create a signed JWT refresh token (30 days)."""
    return _create_token({
        "sub": user_id,
        "email": email,
        "name": name,
        "role": role,
        "is_admin": is_admin,
        "token_type": "refresh",
    }, REFRESH_TOKEN_EXPIRE_SECONDS)


def decode_token(token: str, expected_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Verify signature and decode payload from JWT token."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        header_b64, payload_b64, sig_b64 = parts

        def b64url_decode(s: str) -> bytes:
            s += "=" * ((4 - len(s) % 4) % 4)
            return base64.urlsafe_b64decode(s.encode("utf-8"))

        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
        actual_sig = b64url_decode(sig_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        payload = json.loads(b64url_decode(payload_b64).decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None

        if expected_type and payload.get("token_type") != expected_type:
            # Tolerant for legacy tokens that had no token_type
            if payload.get("token_type") is not None:
                return None

        return payload
    except Exception:
        return None


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    return decode_token(token, expected_type="access")


def decode_refresh_token(token: str) -> Optional[Dict[str, Any]]:
    return decode_token(token, expected_type="refresh")


def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """Optional user authentication dependency."""
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)
    if not payload:
        return None

    email = (payload.get("email") or "").strip().lower()
    admin_emails = [e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "admin@nexusrag.ai,sarthak@example.com").split(",") if e.strip()]
    is_admin = bool(payload.get("is_admin") or payload.get("role") == "admin" or email in admin_emails or email.startswith("admin@"))
    role = "admin" if is_admin else (payload.get("role") or "user")

    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "name": payload.get("name"),
        "role": role,
        "is_admin": is_admin,
    }


def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Required user authentication dependency."""
    user = get_current_user_optional(authorization)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in to access this resource.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_admin(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Admin-only authentication dependency."""
    user = get_current_user(authorization)

    # Check database status for real-time promotion/demotion
    try:
        from backend.db.database import db_manager
        db_user = db_manager.get_user_by_id(user["id"])
        if db_user:
            email = (db_user.get("email") or "").strip().lower()
            admin_emails = [e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "admin@nexusrag.ai,sarthak@example.com").split(",") if e.strip()]
            is_admin = bool(db_user.get("role") == "admin" or db_user.get("is_admin") is True or email in admin_emails or email.startswith("admin@"))
            if is_admin:
                db_user["is_admin"] = True
                db_user["role"] = "admin"
                return db_user
    except Exception:
        pass

    if not user.get("is_admin") and user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Forbidden: You do not have administrator permissions.",
        )
    return user
