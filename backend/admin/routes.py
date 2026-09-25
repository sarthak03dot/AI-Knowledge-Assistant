"""
Admin Management & Analytics API Routes.
Exclusively accessible by Admin users.
"""

import os
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from backend.auth.security import get_current_admin
from backend.db.database import db_manager
from backend.db.models import (
    AdminUserUpdateRole,
    AdminUserUpdatePlan,
    SystemSettingsUpdate,
    UserResponse,
)
from backend.rate_limiter import limiter
from backend.services.payment_service import payment_service

admin_router = APIRouter(prefix="/api/admin", tags=["Admin Panel"])


@admin_router.get("/dashboard")
def get_admin_dashboard(admin: dict = Depends(get_current_admin)):
    """
    Retrieve system telemetry, subscription plan metrics, and financial breakdown.
    """
    metrics = db_manager.get_admin_metrics()
    settings = db_manager.get_system_settings()

    return {
        "status": "success",
        "metrics": metrics,
        "active_rate_limit": limiter.max_requests,
        "payment_gateway": {
            "is_configured": bool(os.getenv("RAZORPAY_KEY_ID") and os.getenv("RAZORPAY_KEY_SECRET")),
            "provider": "Razorpay",
            "key_id": os.getenv("RAZORPAY_KEY_ID", "Not configured"),
        },
        "cloudinary": {
            "configured": bool(os.getenv("CLOUDINARY_CLOUD_NAME")),
            "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME", "Not configured"),
        },
        "plans": settings.get("plans", {}),
    }


@admin_router.get("/settings")
def get_system_settings(admin: dict = Depends(get_current_admin)):
    """
    Get all dynamic system settings (plan prices, doc limits, chat limits, rate limits).
    """
    settings = db_manager.get_system_settings()
    settings["active_rate_limit"] = limiter.max_requests
    return settings


@admin_router.put("/settings")
def update_system_settings(
    req: SystemSettingsUpdate,
    admin: dict = Depends(get_current_admin),
):
    """
    Update global system settings (plan pricing, doc limits, query limits, rate limits).
    """
    updates = req.dict(exclude_unset=True)

    if req.rate_limit_per_minute is not None and req.rate_limit_per_minute > 0:
        limiter.max_requests = req.rate_limit_per_minute
        os.environ["RATE_LIMIT_PER_MINUTE"] = str(req.rate_limit_per_minute)

    updated = db_manager.update_system_settings(updates)
    return {
        "status": "success",
        "message": "System settings updated successfully.",
        "settings": updated,
    }


@admin_router.get("/users")
def list_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str = Query("", description="Search by email, name or user ID"),
    role: str = Query("", description="Filter by role: admin / user"),
    plan: str = Query("", description="Filter by plan: free / pro / enterprise"),
    status: str = Query("", description="Filter by plan status: active / trial / custom"),
    admin: dict = Depends(get_current_admin),
):
    """
    Retrieve registered users with search, role/plan filters, and pagination.
    """
    res = db_manager.get_all_users(
        skip=skip,
        limit=limit,
        search=search,
        role=role,
        plan=plan,
        status=status,
    )
    return {
        "users": res["users"],
        "total": res["total"],
        "skip": skip,
        "limit": limit,
    }


@admin_router.put("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    req: AdminUserUpdateRole,
    admin: dict = Depends(get_current_admin),
):
    """
    Promote user to Admin or demote to standard User.
    """
    role = req.role.lower().strip()
    if role not in ["admin", "user"]:
        raise HTTPException(
            status_code=400,
            detail="Role must be either 'admin' or 'user'",
        )

    # Protect self from accidental demotion if only admin
    if user_id == admin["id"] and role != "admin":
        raise HTTPException(
            status_code=400,
            detail="Cannot demote your own admin account.",
        )

    success = db_manager.update_user_role(user_id, role)
    if not success:
        raise HTTPException(status_code=404, detail="User not found.")

    return {
        "status": "success",
        "user_id": user_id,
        "role": role,
        "message": f"User role successfully updated to {role}.",
    }


@admin_router.put("/users/{user_id}/plan")
def update_user_plan(
    user_id: str,
    req: AdminUserUpdatePlan,
    admin: dict = Depends(get_current_admin),
):
    """
    Manually upgrade, grant custom offer, or modify a user's subscription plan & quotas.
    """
    plan = req.plan.lower().strip()
    plans = db_manager.get_system_settings().get("plans", {})
    if plan not in plans:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid plan '{plan}'. Allowed plans: {list(plans.keys())}",
        )

    success = db_manager.update_user_plan_admin(
        user_id=user_id,
        plan=plan,
        plan_status=req.plan_status or "active",
        offer_note=req.offer_note,
        custom_doc_limit=req.custom_doc_limit,
        custom_query_limit=req.custom_query_limit,
    )
    if not success:
        raise HTTPException(status_code=404, detail="User not found.")

    return {
        "status": "success",
        "user_id": user_id,
        "plan": plan,
        "plan_status": req.plan_status or "active",
        "offer_note": req.offer_note,
        "message": f"User plan and custom quotas successfully updated.",
    }


@admin_router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    admin: dict = Depends(get_current_admin),
):
    """
    Permanently remove a user and all their associated data.
    """
    if user_id == admin["id"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete your own active admin account.",
        )

    success = db_manager.delete_user_by_admin(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found.")

    return {
        "status": "success",
        "user_id": user_id,
        "message": "User and associated data permanently deleted.",
    }


@admin_router.get("/payments")
def list_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str = Query("", description="Search by order ID, payment ID or user ID"),
    status: str = Query("", description="Filter by status: paid / created / failed"),
    plan_id: str = Query("", description="Filter by plan: pro / enterprise"),
    admin: dict = Depends(get_current_admin),
):
    """
    Retrieve payment receipts, transaction order IDs, and statuses with filters and pagination.
    """
    res = db_manager.get_all_payments(
        skip=skip,
        limit=limit,
        search=search,
        status=status,
        plan_id=plan_id,
    )
    return {
        "payments": res["payments"],
        "total": res["total"],
        "skip": skip,
        "limit": limit,
    }


@admin_router.post("/rate-limit")
def update_rate_limit(
    limit_per_min: int = Query(..., ge=1, le=1000),
    admin: dict = Depends(get_current_admin),
):
    """
    Quick endpoint to update global rate limiting threshold.
    """
    limiter.max_requests = limit_per_min
    db_manager.update_system_settings({"rate_limit_per_minute": limit_per_min})
    return {
        "status": "success",
        "rate_limit_per_minute": limit_per_min,
        "message": f"Global rate limit updated to {limit_per_min} requests per minute.",
    }
