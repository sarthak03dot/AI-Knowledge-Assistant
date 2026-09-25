"""
Database Seeder for NexusRAG Assistant.
Seeds default Admin and User accounts and initializes default system configurations.
"""

import os
import sys
import uuid
import time

# Ensure proper paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

ENV_FILE = os.path.join(BASE_DIR, ".env")
if os.path.exists(ENV_FILE):
    with open(ENV_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip()

from backend.db.database import db_manager, DEFAULT_SYSTEM_SETTINGS
from backend.auth.security import hash_password


ADMIN_EMAIL = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@nexusrag.com").strip().lower()
ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "AdminPassword123!").strip()
ADMIN_NAME = os.getenv("DEFAULT_ADMIN_NAME", "System Administrator").strip()

USER_EMAIL = os.getenv("DEFAULT_USER_EMAIL", "user@nexusrag.com").strip().lower()
USER_PASSWORD = os.getenv("DEFAULT_USER_PASSWORD", "UserPassword123!").strip()
USER_NAME = os.getenv("DEFAULT_USER_NAME", "Demo User").strip()


def seed_database(force: bool = False) -> dict:
    """
    Checks if default admin and user exist; if not, seeds them.
    Also ensures global system settings exist.
    """
    results = {
        "admin_created": False,
        "user_created": False,
        "settings_initialized": False,
    }

    # 1. Initialize system settings if not present
    current_settings = db_manager.get_system_settings()
    if not current_settings or "plans" not in current_settings:
        db_manager.update_system_settings(DEFAULT_SYSTEM_SETTINGS)
        results["settings_initialized"] = True
        print("[Seeder] System settings initialized with default plans & rate limits.")

    # 2. Check and Seed Admin User
    existing_admin = db_manager.get_user_by_email(ADMIN_EMAIL)
    if not existing_admin:
        db_manager.create_user(
            user_id=f"usr_{uuid.uuid4().hex[:12]}",
            email=ADMIN_EMAIL,
            name=ADMIN_NAME,
            hashed_password=hash_password(ADMIN_PASSWORD),
            avatar_color="#8b5cf6",
            created_at=time.time(),
            plan="enterprise",
            role="admin",
        )
        results["admin_created"] = True
        print(f"[Seeder] Admin created: {ADMIN_EMAIL} (Password: {ADMIN_PASSWORD}) [Role: admin | Plan: enterprise]")
    else:
        # Ensure role is admin
        if existing_admin.get("role") != "admin" or not existing_admin.get("is_admin"):
            db_manager.update_user_role(existing_admin["id"], "admin")
            print(f"[Seeder] Updated {ADMIN_EMAIL} role to 'admin'.")
        else:
            print(f"[Seeder] Admin account already exists: {ADMIN_EMAIL}")

    # 3. Check and Seed Standard User
    existing_user = db_manager.get_user_by_email(USER_EMAIL)
    if not existing_user:
        db_manager.create_user(
            user_id=f"usr_{uuid.uuid4().hex[:12]}",
            email=USER_EMAIL,
            name=USER_NAME,
            hashed_password=hash_password(USER_PASSWORD),
            avatar_color="#3b82f6",
            created_at=time.time(),
            plan="free",
            role="user",
        )
        results["user_created"] = True
        print(f"[Seeder] Standard User created: {USER_EMAIL} (Password: {USER_PASSWORD}) [Role: user | Plan: free]")
    else:
        print(f"[Seeder] Demo User account already exists: {USER_EMAIL}")

    return results


if __name__ == "__main__":
    print("[Seeder] Running database seed check...")
    res = seed_database()
    print(f"[Seeder] Seed complete: {res}")
