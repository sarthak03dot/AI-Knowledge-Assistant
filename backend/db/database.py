"""
Database Connection & Persistence Layer
Primary (and only): MongoDB Atlas Cloud Database
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


class DatabaseManager:
    def __init__(self):
        self.db_type = "MongoDB Atlas"
        self.mongo_client = None
        self.mongo_db = None
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

            print(f"[Database] ✅ Connected to MongoDB Atlas — database: '{MONGODB_DB_NAME}'")

        except Exception as e:
            raise RuntimeError(
                f"[Database] ❌ Failed to connect to MongoDB Atlas: {e}\n"
                "Check your MONGODB_URI in the .env file and ensure your IP is whitelisted in Atlas."
            )

    # ------------------------------------------------------------------
    # USER OPERATIONS
    # ------------------------------------------------------------------
    def _serialize_user(self, user_doc: dict, doc_ids: Optional[list] = None) -> Dict[str, Any]:
        """Convert a MongoDB user document to a clean dict."""
        ids = doc_ids if doc_ids is not None else user_doc.get("document_ids", [])
        return {
            "id": str(user_doc.get("id") or user_doc.get("_id")),
            "email": user_doc["email"],
            "name": user_doc["name"],
            "hashed_password": user_doc.get("hashed_password", ""),
            "avatar_color": user_doc.get("avatar_color", "#6366f1"),
            "plan": user_doc.get("plan", "free"),
            "plan_status": user_doc.get("plan_status", "active"),
            "plan_updated_at": float(user_doc["plan_updated_at"]) if user_doc.get("plan_updated_at") else None,
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
    ):
        self.mongo_db.users.insert_one({
            "id": user_id,
            "email": email.strip().lower(),
            "name": name,
            "hashed_password": hashed_password,
            "avatar_color": avatar_color,
            "plan": plan,
            "plan_status": "active",
            "plan_updated_at": None,
            "created_at": created_at,
            "document_ids": [],
        })

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
        # Auto-generate title from first user message if still default
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
