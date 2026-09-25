"""
Tests for IP-Based Rate Limiting Middleware and Logic.
Validates max 4 requests per minute per IP enforcement.
"""

import time
import pytest
from fastapi.testclient import TestClient
from backend.rate_limiter import IPRateLimiter, RateLimitMiddleware
from backend.main import app


def test_ip_rate_limiter_unit():
    """Test unit logic of IPRateLimiter with max 4 requests."""
    limiter = IPRateLimiter(max_requests=4, window_seconds=2.0)
    test_ip = "192.168.1.100"

    # First 4 requests must pass
    for i in range(4):
        allowed, remaining, retry_after = limiter.is_allowed(test_ip)
        assert allowed is True, f"Request {i+1} should be allowed"
        assert remaining == (3 - i), f"Remaining should be {3 - i}"

    # 5th request must be blocked
    allowed, remaining, retry_after = limiter.is_allowed(test_ip)
    assert allowed is False, "5th request within the window should be blocked"
    assert remaining == 0
    assert retry_after > 0

    # Another IP should not be affected
    other_ip = "192.168.1.200"
    allowed_other, rem_other, _ = limiter.is_allowed(other_ip)
    assert allowed_other is True
    assert rem_other == 3

    # Wait for the sliding window (2 seconds) to expire
    time.sleep(2.1)
    allowed_after, rem_after, _ = limiter.is_allowed(test_ip)
    assert allowed_after is True
    assert rem_after == 3


def test_fastapi_rate_limiter_integration():
    """Test API endpoint rate limiting with TestClient."""
    from backend.rate_limiter import limiter as global_limiter

    client = TestClient(app)
    custom_ip = "10.0.0.99"
    original_limit = global_limiter.max_requests
    global_limiter.max_requests = 4
    global_limiter.reset_for_ip(custom_ip)

    try:
        headers = {"X-Forwarded-For": custom_ip}

        # 4 requests should succeed
        for i in range(4):
            resp = client.get("/api/health", headers=headers)
            assert resp.status_code == 200, f"Call {i+1} failed with {resp.status_code}: {resp.text}"
            assert "X-RateLimit-Limit" in resp.headers
            assert resp.headers["X-RateLimit-Limit"] == "4"

        # 5th request should receive 429 Too Many Requests
        resp5 = client.get("/api/health", headers=headers)
        assert resp5.status_code == 429, f"Expected 429, got {resp5.status_code}"
        data = resp5.json()
        assert "Rate limit exceeded" in data.get("detail", "")
        assert "Retry-After" in resp5.headers
        assert resp5.headers["X-RateLimit-Remaining"] == "0"
    finally:
        global_limiter.max_requests = original_limit
        global_limiter.reset_for_ip(custom_ip)
