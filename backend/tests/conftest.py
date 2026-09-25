"""
Pytest configuration and shared fixtures.
"""

import pytest
from backend.rate_limiter import limiter


@pytest.fixture(autouse=True)
def clean_rate_limits():
    """Reset rate limiter counts before and after every test."""
    limiter.reset()
    yield
    limiter.reset()
