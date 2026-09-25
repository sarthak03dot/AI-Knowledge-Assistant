"""
Database Connection & Persistence Layer
Primary: MongoDB Atlas Cloud Database with Admin System Settings & Analytics
"""

import os
import time
from typing import Optional, Dict, Any, List

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_FILE = os.path.join(BASE_DIR, ".env")
if os.path.exists(ENV_FILE):
    with open(ENV_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip()

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME") or "nexus_rag"

DEFAULT_SYSTEM_SETTINGS = {
    "key": "global_config",
    "rate_limit_per_minute": int(os.getenv("RATE_LIMIT_PER_MINUTE", "60")),
    "plans": {
        "free": {
            "id": "free",
            "name": "Free Starter",
            "tagline": "For individual testing & basic document Q&A",
            "price_monthly": 0,
            "price_yearly": 0,
            "currency": "INR",
            "document_limit": 5,
            "chunk_limit": 500,
            "query_limit": 50,
            "features": [
                "Up to 5 Documents",
                "Up to 500 Passages",
                "50 AI Queries / month",
                "Executive Analyst AI Persona",
                "Standard Hybrid Search (Dense + Sparse)",
                "Direct Document Attachment",
                "Community Support",
            ],
            "badge": "Current Default",
        },
        "pro": {
            "id": "pro",
            "name": "Pro Intelligence",
            "tagline": "For researchers, developers & professionals",
            "price_monthly": 999,
            "price_yearly": 9590,
            "currency": "INR",
            "document_limit": 100,
            "chunk_limit": 10000,
            "query_limit": 2000,
            "features": [
                "Up to 100 Documents",
                "Up to 10,000 Passages",
                "2,000 AI Queries / month",
                "All 5 AI Personas + Custom Builder",
                "Multi-Document Synthesis & Cross-Analysis",
                "Priority Low-Latency LLM Queue",
                "PDF & Markdown Report Exporting",
                "Email & Priority Support",
            ],
            "badge": "Most Popular",
            "highlight": True,
        },
        "enterprise": {
            "id": "enterprise",
            "name": "Enterprise Suite",
            "tagline": "For teams, large knowledge bases & organizations",
            "price_monthly": 4999,
            "price_yearly": 47990,
            "currency": "INR",
            "document_limit": 1000,
            "chunk_limit": 999999,
            "query_limit": 999999,
            "features": [
                "Unlimited Documents & Passages",
                "Unlimited AI Queries",
                "Dedicated Qdrant Vector Storage",
                "Global Cross-Workspace Deep Reasoning",
                "Custom Enterprise Personas & Role Access",
                "Full API Access & Webhooks Integration",
                "Dedicated Cloudinary Storage Partition",
                "24/7 Enterprise SLA Support",
            ],
            "badge": "Maximum Power",
        },
    },
    "payment_gateway": {
        "provider": "Razorpay",
        "enabled": True,
        "currency": "INR",
        "test_mode": False,
    },
    "ai_settings": {
        "default_llm_provider": "auto",
        "default_top_k": 4,
        "default_alpha": 0.65,
    },
}


class DatabaseManager:
    def __init__(self):
        self.db_type = "MongoDB Atlas"
        self.mongo_client = None
        self.mongo_db = None
        self._cached_settings = None
        self._init_db()

    def _init_db(self):
        """Connect to MongoDB Atlas and ensure all required indexes exist."""
        global MONGODB_URI, MONGODB_DB_NAME
        MONGODB_URI = os.getenv("MONGODB_URI")
        MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME") or "nexus_rag"

        if not MONGODB_URI or ("mongodb+srv://" not in MONGODB_URI and "mongodb://" not in MONGODB_URI):
            raise RuntimeError(
                "[Database] ❌ MONGODB_URI is not set or invalid. "
                "Please add a valid MongoDB Atlas connection string to your .env file."
            )

        try:
            from pymongo import MongoClient, ASCENDING, DESCENDING  # pyrefly: ignore [missing-import]
            self.mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
            self.mongo_client.admin.command("ping")
            self.mongo_db = self.mongo_client[MONGODB_DB_NAME]

            # Ensure indexes
            self.mongo_db.users.create_index([("email", ASCENDING)], unique=True)
            self.mongo_db.pending_registrations.create_index([("email", ASCENDING)], unique=True)
            self.mongo_db.documents.create_index([("user_id", ASCENDING)])
            self.mongo_db.documents.create_index([("doc_id", ASCENDING)], unique=True)
            self.mongo_db.chats.create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
            self.mongo_db.chats.create_index([("id", ASCENDING)], unique=True)
            self.mongo_db.payments.create_index([("user_id", ASCENDING)])
            self.mongo_db.payments.create_index([("order_id", ASCENDING)], unique=True)
            self.mongo_db.settings.create_index([("key", ASCENDING)], unique=True)

            print(f"[Database] Connected to MongoDB Atlas - database: '{MONGODB_DB_NAME}'")

        except Exception as e:
            raise RuntimeError(
                f"[Database] Failed to connect to MongoDB Atlas: {e}\n"
                "Check your MONGODB_URI in the .env file and ensure your IP is whitelisted in Atlas."
            )

    # ------------------------------------------------------------------
    # SYSTEM SETTINGS & DYNAMIC CONFIG
    # ------------------------------------------------------------------
    def get_system_settings(self) -> Dict[str, Any]:
        """Fetch global admin settings from MongoDB with fallback to defaults."""
        try:
            doc = self.mongo_db.settings.find_one({"key": "global_config"})
            if doc:
                merged = dict(DEFAULT_SYSTEM_SETTINGS)
                for k, v in doc.items():
                    if k != "_id":
                        if isinstance(v, dict) and isinstance(merged.get(k), dict):
                            merged[k] = {**merged[k], **v}
                        else:
                            merged[k] = v
                self._cached_settings = merged
                return merged
        except Exception:
            pass

        return DEFAULT_SYSTEM_SETTINGS

    def update_system_settings(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update system settings in MongoDB."""
        current = self.get_system_settings()
        for k, v in updates.items():
            if v is not None:
                if isinstance(v, dict) and isinstance(current.get(k), dict):
                    current[k].update(v)
                else:
                    current[k] = v

        current["updated_at"] = time.time()
        self.mongo_db.settings.update_one(
            {"key": "global_config"},
            {"$set": current},
            upsert=True,
        )
        self._cached_settings = current

        # If rate limit updated, synchronize with active limiter
        if "rate_limit_per_minute" in updates and updates["rate_limit_per_minute"]:
            try:
                from backend.rate_limiter import limiter
                limiter.max_requests = int(updates["rate_limit_per_minute"])
            except Exception:
                pass

        return current

    def get_plan_doc_limit(self, plan_id: str, custom_limit: Optional[int] = None) -> int:
        """Get max documents allowed for a specific plan or custom limit."""
        if custom_limit is not None and custom_limit > 0:
            return custom_limit
        settings = self.get_system_settings()
        plans = settings.get("plans", DEFAULT_SYSTEM_SETTINGS["plans"])
        plan_data = plans.get(plan_id.lower()) or plans.get("free", {})
        return plan_data.get("document_limit", 5)

    def get_plan_query_limit(self, plan_id: str, custom_limit: Optional[int] = None) -> int:
        """Get max chat queries allowed for a specific plan or custom limit."""
        if custom_limit is not None and custom_limit > 0:
            return custom_limit
        settings = self.get_system_settings()
        plans = settings.get("plans", DEFAULT_SYSTEM_SETTINGS["plans"])
        plan_data = plans.get(plan_id.lower()) or plans.get("free", {})
        return plan_data.get("query_limit", 50)

    # ------------------------------------------------------------------
    # USER OPERATIONS
    # ------------------------------------------------------------------
    def _serialize_user(self, user_doc: dict, doc_ids: Optional[list] = None) -> Dict[str, Any]:
        """Convert a MongoDB user document to a clean dict."""
        ids = doc_ids if doc_ids is not None else user_doc.get("document_ids", [])
        email = user_doc["email"]
        admin_emails = [e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "admin@nexusrag.ai,sarthak@example.com").split(",") if e.strip()]
        is_admin = bool(
            user_doc.get("role") == "admin"
            or user_doc.get("is_admin") is True
            or email.strip().lower() in admin_emails
            or email.strip().lower().startswith("admin@")
        )
        role = "admin" if is_admin else user_doc.get("role", "user")

        return {
            "id": str(user_doc.get("id") or user_doc.get("_id")),
            "email": email,
            "name": user_doc["name"],
            "hashed_password": user_doc.get("hashed_password", ""),
            "avatar_color": user_doc.get("avatar_color", "#6366f1"),
            "role": role,
            "is_admin": is_admin,
            "plan": user_doc.get("plan", "free"),
            "plan_status": user_doc.get("plan_status", "active"),
            "plan_updated_at": float(user_doc["plan_updated_at"]) if user_doc.get("plan_updated_at") else None,
            "offer_note": user_doc.get("offer_note"),
            "custom_doc_limit": user_doc.get("custom_doc_limit"),
            "custom_query_limit": user_doc.get("custom_query_limit"),
            "query_count": int(user_doc.get("query_count", 0)),
            "created_at": float(user_doc.get("created_at", 0)),
            "document_ids": ids,
            "documents_count": len(ids),
        }

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        user_doc = self.mongo_db.users.find_one({"email": email.strip().lower()})
        return self._serialize_user(user_doc) if user_doc else None

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        user_doc = self.mongo_db.users.find_one({"id": user_id})
        return self._serialize_user(user_doc) if user_doc else None

    def create_user(
        self,
        user_id: str,
        email: str,
        name: str,
        hashed_password: str,
        avatar_color: str,
        created_at: float,
        plan: str = "free",
        role: str = "user",
    ):
        admin_emails = [e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "admin@nexusrag.ai,sarthak@example.com").split(",") if e.strip()]
        is_admin = role == "admin" or email.strip().lower() in admin_emails or email.strip().lower().startswith("admin@")
        actual_role = "admin" if is_admin else role

        self.mongo_db.users.insert_one({
            "id": user_id,
            "email": email.strip().lower(),
            "name": name,
            "hashed_password": hashed_password,
            "avatar_color": avatar_color,
            "role": actual_role,
            "is_admin": is_admin,
            "plan": plan,
            "plan_status": "active",
            "plan_updated_at": None,
            "query_count": 0,
            "created_at": created_at,
            "document_ids": [],
        })

    def increment_user_query_count(self, user_id: str) -> int:
        """Increment user's total chat queries count."""
        res = self.mongo_db.users.find_one_and_update(
            {"id": user_id},
            {"$inc": {"query_count": 1}},
            return_document=True,
        )
        return res.get("query_count", 1) if res else 1

    def get_all_users(
        self,
        skip: int = 0,
        limit: int = 50,
        search: str = "",
        role: str = "",
        plan: str = "",
        status: str = "",
    ) -> Dict[str, Any]:
        """Fetch filtered and paginated registered users with total count for Admin panel."""
        query: Dict[str, Any] = {}
        if search:
            query["$or"] = [
                {"email": {"$regex": search, "$options": "i"}},
                {"name": {"$regex": search, "$options": "i"}},
                {"id": {"$regex": search, "$options": "i"}},
            ]
        if role:
            query["role"] = role.lower()
        if plan:
            query["plan"] = plan.lower()
        if status:
            query["plan_status"] = status.lower()

        total = self.mongo_db.users.count_documents(query)
        cursor = self.mongo_db.users.find(query).sort("created_at", -1).skip(skip).limit(limit)
        users = [self._serialize_user(u) for u in cursor]
        return {"users": users, "total": total}

    def update_user_role(self, user_id: str, role: str) -> bool:
        """Update user role (admin vs user)."""
        is_admin = (role == "admin")
        res = self.mongo_db.users.update_one(
            {"id": user_id},
            {"$set": {"role": role, "is_admin": is_admin}},
        )
        return res.modified_count > 0 or res.matched_count > 0

    def update_user_plan_admin(
        self,
        user_id: str,
        plan: str,
        plan_status: str = "active",
        offer_note: Optional[str] = None,
        custom_doc_limit: Optional[int] = None,
        custom_query_limit: Optional[int] = None,
    ) -> bool:
        """Admin override for user subscription plan and special offers."""
        update_doc: Dict[str, Any] = {
            "plan": plan,
            "plan_status": plan_status,
            "plan_updated_at": time.time(),
        }
        if offer_note is not None:
            update_doc["offer_note"] = offer_note
        if custom_doc_limit is not None:
            update_doc["custom_doc_limit"] = custom_doc_limit
        if custom_query_limit is not None:
            update_doc["custom_query_limit"] = custom_query_limit

        res = self.mongo_db.users.update_one(
            {"id": user_id},
            {"$set": update_doc},
        )
        return res.modified_count > 0 or res.matched_count > 0

    def delete_user_by_admin(self, user_id: str) -> bool:
        """Permanently delete user, documents, and chats."""
        self.mongo_db.documents.delete_many({"user_id": user_id})
        self.mongo_db.chats.delete_many({"user_id": user_id})
        self.mongo_db.payments.delete_many({"user_id": user_id})
        res = self.mongo_db.users.delete_one({"id": user_id})
        return res.deleted_count > 0

    def upgrade_user_plan(
        self,
        user_id: str,
        plan: str,
        order_id: str,
        payment_id: str,
        amount: int,
        currency: str = "INR",
        billing_cycle: str = "monthly",
        signature: Optional[str] = None,
    ) -> bool:
        """Upgrade user subscription and record the payment receipt."""
        now = time.time()
        payment_record_id = f"pay_{order_id}_{int(now)}"

        self.mongo_db.users.update_one(
            {"id": user_id},
            {"$set": {"plan": plan, "plan_status": "active", "plan_updated_at": now}},
        )
        self.mongo_db.payments.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "id": payment_record_id,
                    "user_id": user_id,
                    "order_id": order_id,
                    "payment_id": payment_id,
                    "plan_id": plan,
                    "billing_cycle": billing_cycle,
                    "amount": amount,
                    "currency": currency,
                    "status": "paid",
                    "signature": signature or "",
                    "created_at": now,
                }
            },
            upsert=True,
        )
        return True

    def record_pending_order(
        self,
        user_id: str,
        order_id: str,
        plan_id: str,
        amount: int,
        currency: str = "INR",
        billing_cycle: str = "monthly",
    ):
        """Record an order when initiated before payment capture."""
        now = time.time()
        self.mongo_db.payments.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "id": f"order_{order_id}",
                    "user_id": user_id,
                    "order_id": order_id,
                    "plan_id": plan_id,
                    "billing_cycle": billing_cycle,
                    "amount": amount,
                    "currency": currency,
                    "status": "created",
                    "created_at": now,
                }
            },
            upsert=True,
        )

    def get_user_payments(self, user_id: str) -> List[Dict[str, Any]]:
        """Retrieve user's payment and transaction history."""
        cursor = self.mongo_db.payments.find({"user_id": user_id}).sort("created_at", -1)
        return [
            {
                "id": p.get("id"),
                "user_id": p.get("user_id"),
                "order_id": p.get("order_id"),
                "payment_id": p.get("payment_id"),
                "plan_id": p.get("plan_id"),
                "billing_cycle": p.get("billing_cycle", "monthly"),
                "amount": p.get("amount", 0),
                "currency": p.get("currency", "INR"),
                "status": p.get("status", "paid"),
                "created_at": float(p.get("created_at", 0)),
            }
            for p in cursor
        ]

    def get_all_payments(
        self,
        skip: int = 0,
        limit: int = 50,
        search: str = "",
        status: str = "",
        plan_id: str = "",
    ) -> Dict[str, Any]:
        """Retrieve filtered & paginated payment records with total count for Admin panel."""
        query: Dict[str, Any] = {}
        if status:
            query["status"] = status.lower()
        if plan_id:
            query["plan_id"] = plan_id.lower()
        if search:
            query["$or"] = [
                {"order_id": {"$regex": search, "$options": "i"}},
                {"payment_id": {"$regex": search, "$options": "i"}},
                {"user_id": {"$regex": search, "$options": "i"}},
            ]

        total = self.mongo_db.payments.count_documents(query)
        cursor = self.mongo_db.payments.find(query).sort("created_at", -1).skip(skip).limit(limit)
        payments = []
        for p in cursor:
            user = self.get_user_by_id(p.get("user_id", ""))
            payments.append({
                "id": p.get("id"),
                "user_id": p.get("user_id"),
                "user_email": user.get("email") if user else "Unknown",
                "user_name": user.get("name") if user else "Unknown",
                "order_id": p.get("order_id"),
                "payment_id": p.get("payment_id"),
                "plan_id": p.get("plan_id"),
                "billing_cycle": p.get("billing_cycle", "monthly"),
                "amount": p.get("amount", 0),
                "currency": p.get("currency", "INR"),
                "status": p.get("status", "paid"),
                "created_at": float(p.get("created_at", 0)),
            })
        return {"payments": payments, "total": total}

    def get_admin_metrics(self) -> Dict[str, Any]:
        """Aggregate high-level telemetry, subscriptions, and financial metrics."""
        total_users = self.mongo_db.users.count_documents({})
        free_users = self.mongo_db.users.count_documents({"plan": "free"})
        pro_users = self.mongo_db.users.count_documents({"plan": "pro"})
        enterprise_users = self.mongo_db.users.count_documents({"plan": "enterprise"})
        total_docs = self.mongo_db.documents.count_documents({})
        total_chats = self.mongo_db.chats.count_documents({})

        # Calculate total revenue from completed payments
        paid_payments = list(self.mongo_db.payments.find({"status": "paid"}))
        total_revenue_paise = sum(p.get("amount", 0) for p in paid_payments)
        total_revenue_inr = total_revenue_paise / 100.0

        return {
            "total_users": total_users,
            "plan_breakdown": {
                "free": free_users,
                "pro": pro_users,
                "enterprise": enterprise_users,
            },
            "total_documents": total_docs,
            "total_chats": total_chats,
            "total_revenue_inr": total_revenue_inr,
            "total_paid_orders": len(paid_payments),
            "recent_payments": self.get_all_payments(limit=10),
        }

    # ------------------------------------------------------------------
    # OTP & PENDING REGISTRATION OPERATIONS
    # ------------------------------------------------------------------
    def save_pending_registration(
        self,
        email: str,
        name: str,
        hashed_password: str,
        avatar_color: str,
        otp: str,
        expires_at: float,
        created_at: Optional[float] = None,
    ):
        clean_email = email.strip().lower()
        now = created_at or time.time()
        self.mongo_db.pending_registrations.update_one(
            {"email": clean_email},
            {
                "$set": {
                    "email": clean_email,
                    "name": name,
                    "hashed_password": hashed_password,
                    "avatar_color": avatar_color,
                    "otp": otp,
                    "expires_at": expires_at,
                    "created_at": now,
                }
            },
            upsert=True,
        )

    def get_pending_registration(self, email: str) -> Optional[Dict[str, Any]]:
        doc = self.mongo_db.pending_registrations.find_one({"email": email.strip().lower()})
        if doc:
            return {
                "email": doc["email"],
                "name": doc["name"],
                "hashed_password": doc["hashed_password"],
                "avatar_color": doc.get("avatar_color", "#6366f1"),
                "otp": str(doc["otp"]),
                "expires_at": float(doc["expires_at"]),
                "created_at": float(doc.get("created_at", 0)),
            }
        return None

    def update_pending_otp(self, email: str, otp: str, expires_at: float):
        self.mongo_db.pending_registrations.update_one(
            {"email": email.strip().lower()},
            {"$set": {"otp": otp, "expires_at": expires_at}},
        )

    def delete_pending_registration(self, email: str):
        self.mongo_db.pending_registrations.delete_one({"email": email.strip().lower()})

    # ------------------------------------------------------------------
    # DOCUMENT OPERATIONS
    # ------------------------------------------------------------------
    def _serialize_doc(self, d: dict) -> Dict[str, Any]:
        return {
            "doc_id": d["doc_id"],
            "user_id": d.get("user_id"),
            "doc_name": d["doc_name"],
            "file_size": d.get("file_size", 0),
            "chunk_count": d.get("chunk_count", 0),
            "char_count": d.get("char_count", 0),
            "word_count": d.get("word_count", 0),
            "cloudinary_url": d.get("cloudinary_url"),
            "cloudinary_public_id": d.get("cloudinary_public_id"),
            "created_at": float(d.get("created_at", 0)),
        }

    def add_user_document(
        self,
        user_id: str,
        doc_id: str,
        doc_name: str,
        file_size: int = 0,
        chunk_count: int = 0,
        char_count: int = 0,
        word_count: int = 0,
        cloudinary_url: Optional[str] = None,
        cloudinary_public_id: Optional[str] = None,
        created_at: Optional[float] = None,
    ) -> Dict[str, Any]:
        doc_data = {
            "doc_id": doc_id,
            "user_id": user_id,
            "doc_name": doc_name,
            "file_size": file_size,
            "chunk_count": chunk_count,
            "char_count": char_count,
            "word_count": word_count,
            "cloudinary_url": cloudinary_url,
            "cloudinary_public_id": cloudinary_public_id,
            "created_at": created_at or time.time(),
        }
        self.mongo_db.documents.update_one({"doc_id": doc_id}, {"$set": doc_data}, upsert=True)
        self.mongo_db.users.update_one({"id": user_id}, {"$addToSet": {"document_ids": doc_id}})
        return doc_data

    def get_user_documents(self, user_id: str) -> List[Dict[str, Any]]:
        cursor = self.mongo_db.documents.find({"user_id": user_id}).sort("created_at", -1)
        return [self._serialize_doc(d) for d in cursor]

    def get_document_by_id(self, doc_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        query: Dict[str, Any] = {"doc_id": doc_id}
        if user_id:
            query["user_id"] = user_id
        doc = self.mongo_db.documents.find_one(query)
        return self._serialize_doc(doc) if doc else None

    def delete_user_document(self, doc_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        doc = self.get_document_by_id(doc_id, user_id)
        if not doc:
            return None
        actual_user_id = doc.get("user_id") or user_id
        self.mongo_db.documents.delete_one({"doc_id": doc_id})
        if actual_user_id:
            self.mongo_db.users.update_one({"id": actual_user_id}, {"$pull": {"document_ids": doc_id}})
        return doc

    # ------------------------------------------------------------------
    # CHAT CONVERSATION SESSIONS
    # ------------------------------------------------------------------
    def get_user_chats(self, user_id: str) -> List[Dict[str, Any]]:
        cursor = self.mongo_db.chats.find({"user_id": user_id}).sort("updated_at", -1)
        chats = []
        for c in cursor:
            msgs = c.get("messages", [])
            last_msg = msgs[-1]["content"][:90] if msgs else ""
            chats.append({
                "id": c["id"],
                "user_id": c["user_id"],
                "title": c.get("title", "Conversation"),
                "persona": c.get("persona", "executive"),
                "custom_persona": c.get("custom_persona"),
                "message_count": len(msgs),
                "last_message": last_msg,
                "created_at": float(c.get("created_at", 0)),
                "updated_at": float(c.get("updated_at", 0)),
            })
        return chats

    def get_chat_by_id(self, chat_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        query: Dict[str, Any] = {"id": chat_id}
        if user_id:
            query["user_id"] = user_id
        c = self.mongo_db.chats.find_one(query)
        if c:
            return {
                "id": c["id"],
                "user_id": c["user_id"],
                "title": c.get("title", "Conversation"),
                "persona": c.get("persona", "executive"),
                "custom_persona": c.get("custom_persona"),
                "messages": c.get("messages", []),
                "created_at": float(c.get("created_at", 0)),
                "updated_at": float(c.get("updated_at", 0)),
            }
        return None

    def save_chat_session(
        self,
        chat_id: str,
        user_id: str,
        title: Optional[str] = None,
        persona: Optional[str] = "executive",
        custom_persona: Optional[str] = None,
        messages: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Create or update a chat session with its messages."""
        now = time.time()
        existing = self.get_chat_by_id(chat_id, user_id)

        chat_title = title or (existing.get("title") if existing else "New Conversation")
        if (not chat_title or chat_title == "New Conversation") and messages:
            first_user_msg = next((m for m in messages if m.get("role") == "user"), None)
            if first_user_msg and first_user_msg.get("content"):
                snippet = first_user_msg["content"].strip().replace("\n", " ")
                chat_title = snippet[:45] + ("..." if len(snippet) > 45 else "")

        chat_persona = persona or (existing.get("persona") if existing else "executive")
        chat_custom_persona = custom_persona if custom_persona is not None else (existing.get("custom_persona") if existing else None)
        chat_created_at = existing.get("created_at") if existing else now
        msg_list = messages if messages is not None else (existing.get("messages", []) if existing else [])

        chat_data = {
            "id": chat_id,
            "user_id": user_id,
            "title": chat_title,
            "persona": chat_persona,
            "custom_persona": chat_custom_persona,
            "messages": msg_list,
            "created_at": chat_created_at,
            "updated_at": now,
        }
        self.mongo_db.chats.update_one({"id": chat_id}, {"$set": chat_data}, upsert=True)
        return chat_data

    def delete_chat(self, chat_id: str, user_id: Optional[str] = None) -> bool:
        """Delete a chat session."""
        query: Dict[str, Any] = {"id": chat_id}
        if user_id:
            query["user_id"] = user_id
        res = self.mongo_db.chats.delete_one(query)
        return res.deleted_count > 0


db_manager = DatabaseManager()
