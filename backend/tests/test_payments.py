"""
Unit & Integration Tests for Razorpay Payment Service, Plan Upgrades, and Signature Verification.
"""

import os
import sys
import unittest
import hmac
import hashlib

# Add project root and backend to sys.path
TEST_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(TEST_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

for path in [PROJECT_ROOT, BACKEND_DIR]:
    if path not in sys.path:
        sys.path.insert(0, path)

from backend.services.payment_service import payment_service, PRICING_PLANS
from backend.db.database import DatabaseManager


class TestPaymentService(unittest.TestCase):
    def setUp(self):
        self.db = DatabaseManager()
        self.test_user_id = "test_pay_user_001"
        self.test_email = "paytest@yopmail.com"
        # Ensure test user exists in DB
        existing = self.db.get_user_by_id(self.test_user_id)
        if not existing:
            self.db.create_user(
                user_id=self.test_user_id,
                email=self.test_email,
                name="Payment Tester",
                hashed_password="mock_hashed_pw",
                avatar_color="#6366f1",
                created_at=1700000000.0,
                plan="free",
            )

    def test_pricing_plans_structure(self):
        plans = payment_service.get_plans()
        self.assertIn("free", plans)
        self.assertIn("pro", plans)
        self.assertIn("enterprise", plans)

        pro = plans["pro"]
        self.assertEqual(pro["price_monthly"], 999)
        self.assertEqual(pro["document_limit"], 100)
        self.assertTrue(len(pro["features"]) > 0)

    def test_order_creation_pro_plan(self):
        order = payment_service.create_order(
            plan_id="pro",
            billing_cycle="monthly",
            user_email=self.test_email,
            user_name="Payment Tester",
        )
        self.assertIn("order_id", order)
        self.assertEqual(order["amount"], 99900)  # 999 * 100 paise
        self.assertEqual(order["currency"], "INR")
        self.assertEqual(order["plan_id"], "pro")

    def test_order_creation_yearly_discount(self):
        order = payment_service.create_order(
            plan_id="pro",
            billing_cycle="yearly",
            user_email=self.test_email,
            user_name="Payment Tester",
        )
        self.assertIn("order_id", order)
        self.assertEqual(order["amount"], 959000)  # 9590 * 100 paise
        self.assertEqual(order["billing_cycle"], "yearly")

    def test_invalid_plan_order_raises_error(self):
        with self.assertRaises(ValueError):
            payment_service.create_order(plan_id="invalid_tier")

    def test_free_plan_order_raises_error(self):
        with self.assertRaises(ValueError):
            payment_service.create_order(plan_id="free")

    def test_signature_verification(self):
        order_id = "order_test_123456"
        payment_id = "pay_test_789012"
        secret = payment_service.key_secret or "test_secret_key"

        # Generate valid HMAC-SHA256 signature
        msg = f"{order_id}|{payment_id}".encode("utf-8")
        valid_sig = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

        # Temporarily mock secret
        prev_secret = payment_service.key_secret
        payment_service.key_secret = secret

        try:
            self.assertTrue(payment_service.verify_payment_signature(order_id, payment_id, valid_sig))
            self.assertFalse(payment_service.verify_payment_signature(order_id, payment_id, "invalid_sig_abc123"))
        finally:
            payment_service.key_secret = prev_secret

    def test_database_upgrade_user_plan(self):
        order_id = "order_db_test_001"
        payment_id = "pay_db_test_001"
        success = self.db.upgrade_user_plan(
            user_id=self.test_user_id,
            plan="pro",
            order_id=order_id,
            payment_id=payment_id,
            amount=99900,
            currency="INR",
            billing_cycle="monthly",
            signature="test_sig",
        )
        self.assertTrue(success)

        # Verify user record updated
        user = self.db.get_user_by_id(self.test_user_id)
        self.assertIsNotNone(user)
        self.assertEqual(user["plan"], "pro")
        self.assertEqual(user["plan_status"], "active")
        self.assertIsNotNone(user.get("plan_updated_at"))

    def test_database_get_user_payments(self):
        order_id = "order_hist_test_002"
        payment_id = "pay_hist_test_002"
        self.db.upgrade_user_plan(
            user_id=self.test_user_id,
            plan="enterprise",
            order_id=order_id,
            payment_id=payment_id,
            amount=4799000,
            currency="INR",
            billing_cycle="yearly",
            signature="test_sig_enterprise",
        )

        payments = self.db.get_user_payments(self.test_user_id)
        self.assertIsInstance(payments, list)
        self.assertTrue(len(payments) > 0)
        latest = payments[0]
        self.assertEqual(latest["plan_id"], "enterprise")
        self.assertEqual(latest["status"], "paid")


if __name__ == "__main__":
    unittest.main()
