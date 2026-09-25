"""
Razorpay Payment Service for Subscription & Plan Upgrades.
Supports:
1. Razorpay REST API (https://api.razorpay.com/v1/orders)
2. Cryptographic HMAC-SHA256 signature verification
3. Zero-dependency fallback sandbox mode for development
"""

import os
import hmac
import hashlib
import json
import base64
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

import os
import hmac
import hashlib
import json
import base64
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_FILE = os.path.join(BASE_DIR, ".env")
if os.path.exists(ENV_FILE):
    with open(ENV_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip()

# Load environment variables
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "").strip()
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "").strip()

# Pricing Plans Configuration (Amounts in INR - Lowest denomination in paise: 1 INR = 100 paise)
PRICING_PLANS = {
    "free": {
        "id": "free",
        "name": "Free Starter",
        "tagline": "For individual testing & basic document Q&A",
        "price_monthly": 0,
        "price_yearly": 0,
        "currency": "INR",
        "features": [
            "Up to 10 Documents",
            "Up to 500 Passages",
            "Executive Analyst AI Persona",
            "Standard Hybrid Search (Dense + Sparse)",
            "Direct Document Attachment",
            "Community Support",
        ],
        "document_limit": 10,
        "chunk_limit": 500,
        "badge": "Current Default",
    },
    "pro": {
        "id": "pro",
        "name": "Pro Intelligence",
        "tagline": "For researchers, developers & professionals",
        "price_monthly": 999,      # ₹999/month
        "price_yearly": 9590,      # ₹9,590/year (20% OFF)
        "currency": "INR",
        "features": [
            "Up to 100 Documents",
            "Up to 10,000 Passages",
            "All 5 AI Personas + Custom Builder",
            "Multi-Document Synthesis & Cross-Analysis",
            "Priority Low-Latency LLM Queue",
            "PDF & Markdown Report Exporting",
            "Email & Priority Support",
        ],
        "document_limit": 100,
        "chunk_limit": 10000,
        "badge": "Most Popular",
        "highlight": True,
    },
    "enterprise": {
        "id": "enterprise",
        "name": "Enterprise Suite",
        "tagline": "For teams, large knowledge bases & organizations",
        "price_monthly": 4999,     # ₹4,999/month
        "price_yearly": 47990,     # ₹47,990/year (20% OFF)
        "currency": "INR",
        "features": [
            "Unlimited Documents & Passages",
            "Dedicated Qdrant Vector Storage",
            "Global Cross-Workspace Deep Reasoning",
            "Custom Enterprise Personas & Role Access",
            "Full API Access & Webhooks Integration",
            "Dedicated Cloudinary Storage Partition",
            "24/7 Enterprise SLA Support",
        ],
        "document_limit": 999999,
        "chunk_limit": 999999,
        "badge": "Maximum Power",
    },
}


class PaymentService:
    def __init__(self):
        self._refresh_keys()

    def _refresh_keys(self):
        self.key_id = os.getenv("RAZORPAY_KEY_ID", "").strip()
        self.key_secret = os.getenv("RAZORPAY_KEY_SECRET", "").strip()
        self.is_live = bool(self.key_id and self.key_secret and not self.key_id.startswith("rzp_test_placeholder"))

    def get_plans(self) -> Dict[str, Any]:
        """Return available pricing plans from DB settings or static defaults."""
        try:
            from backend.db.database import db_manager
            settings = db_manager.get_system_settings()
            if "plans" in settings and settings["plans"]:
                return settings["plans"]
        except Exception:
            pass
        return PRICING_PLANS

    def create_order(
        self,
        plan_id: str,
        billing_cycle: str = "monthly",
        user_email: str = "",
        user_name: str = "",
        notes: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Create a Razorpay order via REST API or Sandbox fallback.
        Amount is converted to paise (INR * 100).
        """
        self._refresh_keys()
        plans = self.get_plans()
        plan = plans.get(plan_id.lower())
        if not plan:
            raise ValueError(f"Invalid plan ID: '{plan_id}'")

        price = plan["price_yearly"] if billing_cycle == "yearly" else plan["price_monthly"]
        if price <= 0:
            raise ValueError("Free plan does not require a payment order.")

        amount_in_paise = int(price * 100)
        currency = plan.get("currency", "INR")
        receipt = f"rcpt_{plan_id}_{int(os.times().elapsed * 1000)}"

        order_notes = {
            "plan_id": plan_id,
            "billing_cycle": billing_cycle,
            "user_email": user_email,
            "user_name": user_name,
            **(notes or {}),
        }

        # If live/test Razorpay API credentials are configured, call Razorpay API
        if self.key_id and self.key_secret:
            try:
                auth_str = f"{self.key_id}:{self.key_secret}"
                b64_auth = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")

                payload = json.dumps({
                    "amount": amount_in_paise,
                    "currency": currency,
                    "receipt": receipt,
                    "notes": order_notes,
                }).encode("utf-8")

                req = urllib.request.Request(
                    "https://api.razorpay.com/v1/orders",
                    data=payload,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Basic {b64_auth}",
                    },
                    method="POST",
                )

                with urllib.request.urlopen(req, timeout=10) as resp:
                    res_data = json.loads(resp.read().decode("utf-8"))
                    print(f"[Razorpay] Order created successfully: {res_data.get('id')}")
                    return {
                        "order_id": res_data["id"],
                        "amount": res_data["amount"],
                        "currency": res_data["currency"],
                        "key_id": self.key_id,
                        "plan_id": plan_id,
                        "plan_name": plan["name"],
                        "billing_cycle": billing_cycle,
                        "receipt": receipt,
                        "is_sandbox": False,
                    }
            except Exception as err:
                print(f"[Razorpay] API notice: {err}. Falling back to sandbox order mode.")

        # Sandbox / Fallback Order Generation for Development
        mock_order_id = f"order_sandbox_{hashlib.md5(f'{receipt}_{amount_in_paise}'.encode()).hexdigest()[:14]}"
        return {
            "order_id": mock_order_id,
            "amount": amount_in_paise,
            "currency": currency,
            "key_id": self.key_id or "rzp_test_sandbox",
            "plan_id": plan_id,
            "plan_name": plan["name"],
            "billing_cycle": billing_cycle,
            "receipt": receipt,
            "is_sandbox": True,
        }

    def verify_payment_signature(
        self,
        order_id: str,
        payment_id: str,
        signature: str,
    ) -> bool:
        """
        Verify Razorpay cryptographic signature:
        HMAC-SHA256(order_id + "|" + payment_id, secret) == signature
        """
        self._refresh_keys()
        
        # Sandbox order bypass
        if order_id.startswith("order_sandbox_") or not self.key_secret:
            return True

        try:
            msg = f"{order_id}|{payment_id}".encode("utf-8")
            expected_signature = hmac.new(
                self.key_secret.encode("utf-8"),
                msg,
                hashlib.sha256,
            ).hexdigest()

            # Constant-time comparison to prevent timing attacks
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            print(f"[Razorpay] ❌ Signature verification error: {e}")
            return False


payment_service = PaymentService()
