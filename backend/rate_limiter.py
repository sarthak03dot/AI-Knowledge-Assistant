"""
IP-Based Sliding Window Rate Limiter Middleware for FastAPI.
Enforces a maximum request threshold per client IP (default: 4 requests/minute).
"""

import os
import time
import threading
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class IPRateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter tracking timestamps per IP address.
    """

    def __init__(
        self,
        max_requests: int = 4,
        window_seconds: float = 60.0,
    ):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._ip_history: Dict[str, List[float]] = defaultdict(list)
        self._lock = threading.Lock()
        self._last_cleanup = time.time()

    def get_client_ip(self, request: Request) -> str:
        """
        Extract real client IP considering forward proxies (X-Forwarded-For, X-Real-IP).
        """
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # X-Forwarded-For may contain a comma-separated list of IPs: client, proxy1, proxy2
            client_ip = forwarded_for.split(",")[0].strip()
            if client_ip:
                return client_ip

        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()

        if request.client and request.client.host:
            return request.client.host.strip()

        return "127.0.0.1"

    def is_allowed(self, client_ip: str) -> Tuple[bool, int, int]:
        """
        Checks if the request from client_ip is allowed.
        Returns:
            (is_allowed: bool, remaining_requests: int, retry_after_seconds: int)
        """
        now = time.time()
        window_start = now - self.window_seconds

        with self._lock:
            # Periodic cleanup of old keys (every 5 minutes)
            if now - self._last_cleanup > 300:
                self._cleanup(now)

            timestamps = self._ip_history[client_ip]

            # Filter out timestamps older than the sliding window
            valid_timestamps = [t for t in timestamps if t > window_start]
            self._ip_history[client_ip] = valid_timestamps

            count = len(valid_timestamps)

            if count >= self.max_requests:
                # Rate limit exceeded
                oldest_timestamp = valid_timestamps[0]
                retry_after = max(1, int(oldest_timestamp + self.window_seconds - now) + 1)
                return False, 0, retry_after

            # Request allowed: record this timestamp
            valid_timestamps.append(now)
            remaining = self.max_requests - len(valid_timestamps)
            return True, remaining, int(self.window_seconds)

    def _cleanup(self, now: float):
        """Removes expired IPs from memory."""
        window_start = now - self.window_seconds
        stale_ips = []
        for ip, timestamps in self._ip_history.items():
            valid = [t for t in timestamps if t > window_start]
            if not valid:
                stale_ips.append(ip)
            else:
                self._ip_history[ip] = valid
        for ip in stale_ips:
            del self._ip_history[ip]
        self._last_cleanup = now

    def reset_for_ip(self, ip: str):
        """Reset rate limit history for a specific IP (useful for testing/admin)."""
        with self._lock:
            if ip in self._ip_history:
                del self._ip_history[ip]

    def reset(self):
        """Reset all rate limiter history."""
        with self._lock:
            self._ip_history.clear()


# Singleton instance initialized from environment variables
DEFAULT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
DEFAULT_WINDOW_SECONDS = float(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60.0"))

limiter = IPRateLimiter(
    max_requests=DEFAULT_MAX_REQUESTS,
    window_seconds=DEFAULT_WINDOW_SECONDS,
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware that intercepts incoming API requests and applies the sliding window rate limit.
    """

    def __init__(
        self,
        app,
        rate_limiter: Optional[IPRateLimiter] = None,
        exempt_paths: Optional[List[str]] = None,
    ):
        super().__init__(app)
        self.limiter = rate_limiter or limiter
        # Endpoints that are exempt (e.g. basic health probe if needed, or docs)
        self.exempt_paths = exempt_paths or [
            "/docs",
            "/redoc",
            "/openapi.json",
            "/favicon.ico",
        ]

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Only apply rate limiter to /api/ endpoints (leave static frontend assets unrestricted)
        if not path.startswith("/api/"):
            return await call_next(request)

        # Check exemptions
        if path in self.exempt_paths:
            return await call_next(request)

        client_ip = self.limiter.get_client_ip(request)
        allowed, remaining, retry_after = self.limiter.is_allowed(client_ip)

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"Rate limit exceeded. Maximum {self.limiter.max_requests} requests per minute are allowed from this IP address.",
                    "error": "too_many_requests",
                    "client_ip": client_ip,
                    "retry_after_seconds": retry_after,
                    "limit_per_minute": self.limiter.max_requests,
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(self.limiter.max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(retry_after),
                },
            )

        # Process the request
        response: Response = await call_next(request)

        # Attach rate limiting headers
        response.headers["X-RateLimit-Limit"] = str(self.limiter.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(retry_after)

        return response
