import time
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.db.database import db_manager
from backend.services.email_service import email_service

client = TestClient(app)


def test_email_service_fallback_and_html_generation():
    result = email_service.send_otp_email(
        recipient_email="test_user@nexusrag.ai",
        recipient_name="Test Developer",
        otp_code="789456",
    )
    assert result["success"] is True
    assert result["recipient"] == "test_user@nexusrag.ai"
    assert "provider" in result


def test_full_registration_otp_verification_flow():
    timestamp = int(time.time() * 1000)
    email = f"otp_user_{timestamp}@testdomain.com"
    name = "OTP Verification User"
    password = "MySecurePassword2026!"

    # 1. Step 1: Initiate registration -> should return requires_otp: True
    init_res = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "name": name},
    )
    assert init_res.status_code == 200, init_res.text
    init_data = init_res.json()
    assert init_data["status"] == "otp_required"
    assert init_data["requires_otp"] is True
    assert init_data["email"] == email

    # 2. Verify pending record exists in DB with 6-digit OTP
    pending = db_manager.get_pending_registration(email)
    assert pending is not None
    assert len(pending["otp"]) == 6
    correct_otp = pending["otp"]

    # 3. Test wrong OTP rejection
    bad_otp_res = client.post(
        "/api/auth/verify-otp",
        json={"email": email, "otp": "000000"},
    )
    assert bad_otp_res.status_code == 400
    assert "Incorrect" in bad_otp_res.json()["detail"] or "invalid" in bad_otp_res.json()["detail"].lower()

    # 4. Test resend OTP functionality
    resend_res = client.post("/api/auth/resend-otp", json={"email": email})
    assert resend_res.status_code == 200
    assert resend_res.json()["status"] == "success"

    # Get the updated OTP after resend
    updated_pending = db_manager.get_pending_registration(email)
    assert updated_pending is not None
    active_otp = updated_pending["otp"]

    # 5. Step 2: Verify with correct OTP
    verify_res = client.post(
        "/api/auth/verify-otp",
        json={"email": email, "otp": active_otp},
    )
    assert verify_res.status_code == 200, verify_res.text
    auth_data = verify_res.json()
    assert "access_token" in auth_data
    assert "refresh_token" in auth_data
    assert auth_data["user"]["email"] == email
    assert auth_data["user"]["name"] == name

    # 6. Verify user is now in database and pending record is cleaned up
    verified_user = db_manager.get_user_by_email(email)
    assert verified_user is not None
    assert db_manager.get_pending_registration(email) is None

    # 7. Test login with newly verified account
    login_res = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    assert login_res.json()["user"]["email"] == email
