"""
Payment & Subscription Routes for Plan Upgrades.
Endpoints:
- GET  /api/payments/plans
- POST /api/payments/create-order
- POST /api/payments/verify-payment
- GET  /api/payments/history
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

try:
    from backend.db.database import DatabaseManager, db_manager
    from backend.services.payment_service import payment_service
    from backend.auth.security import get_current_user
except (ImportError, ModuleNotFoundError):
    from db.database import DatabaseManager, db_manager
    from services.payment_service import payment_service
    from auth.security import get_current_user

router = APIRouter(prefix="/api/payments", tags=["payments"])


class CreateOrderRequest(BaseModel):
    plan_id: str
    billing_cycle: str = Field(default="monthly", pattern="^(monthly|yearly)$")


class VerifyPaymentRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: str
    plan_id: str
    billing_cycle: str = "monthly"
    amount: Optional[int] = 0
    currency: Optional[str] = "INR"


@router.get("/plans")
def get_pricing_plans():
    """Retrieve all available subscription & pricing plans."""
    return {"plans": payment_service.get_plans()}


@router.post("/create-order")
def create_payment_order(
    req: CreateOrderRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Create a Razorpay order for subscription plan upgrade.
    """
    plan_id = req.plan_id.lower().strip()
    billing_cycle = req.billing_cycle.lower().strip()

    plans = payment_service.get_plans()
    if plan_id not in plans:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan '{plan_id}'. Available plans: {list(plans.keys())}",
        )

    if plan_id == "free":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Free plan does not require a payment order.",
        )

    user_id = current_user["id"]
    user_email = current_user.get("email", "")
    user_name = current_user.get("name", "")

    try:
        order_data = payment_service.create_order(
            plan_id=plan_id,
            billing_cycle=billing_cycle,
            user_email=user_email,
            user_name=user_name,
            notes={"user_id": user_id},
        )

        # Record pending order in database
        db_manager.record_pending_order(
            user_id=user_id,
            order_id=order_data["order_id"],
            plan_id=plan_id,
            amount=order_data["amount"],
            currency=order_data["currency"],
            billing_cycle=billing_cycle,
        )

        return {
            "status": "success",
            "order": order_data,
            "user": {
                "name": user_name,
                "email": user_email,
            },
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payment order: {str(e)}",
        )


@router.post("/verify-payment")
def verify_payment(
    req: VerifyPaymentRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Verify Razorpay HMAC-SHA256 signature and upgrade user subscription.
    """
    user_id = current_user["id"]
    plan_id = req.plan_id.lower().strip()

    plans = payment_service.get_plans()
    if plan_id not in plans or plan_id == "free":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid target plan for upgrade.",
        )

    # 1. Cryptographic Signature Verification
    is_valid = payment_service.verify_payment_signature(
        order_id=req.order_id,
        payment_id=req.payment_id,
        signature=req.signature,
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed: Invalid cryptographic signature.",
        )

    # 2. Upgrade User Subscription & Record Paid Receipt
    plan_info = plans[plan_id]
    expected_amount = (
        plan_info["price_yearly"] * 100
        if req.billing_cycle == "yearly"
        else plan_info["price_monthly"] * 100
    )
    final_amount = req.amount or expected_amount

    success = db_manager.upgrade_user_plan(
        user_id=user_id,
        plan=plan_id,
        order_id=req.order_id,
        payment_id=req.payment_id,
        amount=final_amount,
        currency=req.currency or "INR",
        billing_cycle=req.billing_cycle,
        signature=req.signature,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user subscription status in database.",
        )

    # 3. Retrieve updated user object
    updated_user = db_manager.get_user_by_id(user_id)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found after upgrade.",
        )

    return {
        "status": "success",
        "message": f"🎉 Congratulations! Your account has been upgraded to {plan_info['name']}.",
        "plan": plan_id,
        "billing_cycle": req.billing_cycle,
        "payment_id": req.payment_id,
        "user": {
            "id": updated_user["id"],
            "email": updated_user["email"],
            "name": updated_user["name"],
            "avatar_color": updated_user.get("avatar_color", "#6366f1"),
            "plan": updated_user.get("plan", plan_id),
            "plan_status": updated_user.get("plan_status", "active"),
            "plan_updated_at": updated_user.get("plan_updated_at"),
            "documents_count": updated_user.get("documents_count", 0),
        },
    }


@router.get("/history")
def get_payment_history(
    current_user: dict = Depends(get_current_user),
):
    """Retrieve transaction history and receipts for current authenticated user."""
    user_id = current_user["id"]
    payments = db_manager.get_user_payments(user_id)
    return {
        "user_id": user_id,
        "total": len(payments),
        "payments": payments,
    }


@router.get("/usage")
def get_plan_usage(
    current_user: dict = Depends(get_current_user),
):
    """Retrieve current plan resource consumption (documents & chunks usage)."""
    user_id = current_user["id"]
    plan_id = (current_user.get("plan") or "free").lower()
    plans = payment_service.get_plans()
    plan_info = plans.get(plan_id, plans.get("free", {}))

    docs = db_manager.get_user_documents(user_id)
    doc_count = len(docs)
    chunk_count = sum(d.get("chunk_count", 0) for d in docs)

    doc_limit = plan_info.get("document_limit", 10)
    chunk_limit = plan_info.get("chunk_limit", 500)

    doc_pct = min(100.0, round((doc_count / max(1, doc_limit)) * 100, 1)) if doc_limit < 999999 else 0.0
    chunk_pct = min(100.0, round((chunk_count / max(1, chunk_limit)) * 100, 1)) if chunk_limit < 999999 else 0.0

    return {
        "plan_id": plan_id,
        "plan_name": plan_info.get("name", "Free Starter"),
        "plan_status": current_user.get("plan_status", "active"),
        "plan_updated_at": current_user.get("plan_updated_at"),
        "document_count": doc_count,
        "document_limit": doc_limit,
        "document_usage_percent": doc_pct,
        "chunk_count": chunk_count,
        "chunk_limit": chunk_limit,
        "chunk_usage_percent": chunk_pct,
        "features": plan_info.get("features", []),
        "is_unlimited_docs": doc_limit >= 999999,
        "is_unlimited_chunks": chunk_limit >= 999999,
    }
