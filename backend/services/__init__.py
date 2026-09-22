"""
NexusRAG Services Package
"""
try:
    from backend.services.email_service import email_service
    from backend.services.payment_service import payment_service, PRICING_PLANS
except ImportError:
    from services.email_service import email_service
    from services.payment_service import payment_service, PRICING_PLANS

__all__ = ["email_service", "payment_service", "PRICING_PLANS"]
