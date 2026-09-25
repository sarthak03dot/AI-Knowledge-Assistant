"""
Unit & Integration Tests for Admin Panel, System Settings, Plan Limits, and RBAC.
"""

import pytest
import time
from fastapi.testclient import TestClient
from backend.main import app
from backend.db.database import db_manager
from backend.auth.security import create_access_token

client = TestClient(app)


def test_admin_rbac_protection():
    """Ensure non-admin users get 403 Forbidden on admin endpoints."""
    # 1. Create standard user token
    regular_user_token = create_access_token(
        user_id="regular_user_001",
        email="regular@example.com",
        name="Regular User",
        role="user",
        is_admin=False,
    )
    headers = {"Authorization": f"Bearer {regular_user_token}"}

    res = client.get("/api/admin/dashboard", headers=headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}"

    res_settings = client.get("/api/admin/settings", headers=headers)
    assert res_settings.status_code == 403


def test_admin_dashboard_and_settings_flow():
    """Ensure admin can view dashboard, update plan limits, and manage users."""
    admin_id = "admin_test_001"
    admin_email = "admin@nexusrag.ai"
    admin_name = "Chief Admin"

    # Ensure admin user exists in DB
    if not db_manager.get_user_by_id(admin_id):
        db_manager.create_user(
            user_id=admin_id,
            email=admin_email,
            name=admin_name,
            hashed_password="mock_pw",
            avatar_color="#6366f1",
            created_at=time.time(),
            plan="enterprise",
            role="admin",
        )

    admin_token = create_access_token(
        user_id=admin_id,
        email=admin_email,
        name=admin_name,
        role="admin",
        is_admin=True,
    )
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Fetch Admin Dashboard
    dash_res = client.get("/api/admin/dashboard", headers=admin_headers)
    assert dash_res.status_code == 200, dash_res.text
    dash_data = dash_res.json()
    assert "metrics" in dash_data
    assert "plans" in dash_data
    assert "active_rate_limit" in dash_data

    # 2. Fetch System Settings
    settings_res = client.get("/api/admin/settings", headers=admin_headers)
    assert settings_res.status_code == 200
    settings = settings_res.json()
    assert "plans" in settings
    assert "free" in settings["plans"]

    # 3. Update Free Plan Document Limit to 7
    updated_plans = settings["plans"]
    updated_plans["free"]["document_limit"] = 7
    updated_plans["pro"]["price_monthly"] = 1099

    update_res = client.put(
        "/api/admin/settings",
        json={"plans": updated_plans, "rate_limit_per_minute": 6},
        headers=admin_headers,
    )
    assert update_res.status_code == 200, update_res.text
    new_settings = update_res.json()["settings"]
    assert new_settings["plans"]["free"]["document_limit"] == 7
    assert new_settings["plans"]["pro"]["price_monthly"] == 1099

    # Verify db_manager dynamic limit reflection
    assert db_manager.get_plan_doc_limit("free") == 7

    # 4. List users
    users_res = client.get("/api/admin/users", headers=admin_headers)
    assert users_res.status_code == 200
    assert "users" in users_res.json()

    # 5. Reset back to clean default for subsequent tests
    updated_plans["free"]["document_limit"] = 5
    updated_plans["pro"]["price_monthly"] = 999
    client.put(
        "/api/admin/settings",
        json={"plans": updated_plans, "rate_limit_per_minute": 4},
        headers=admin_headers,
    )
