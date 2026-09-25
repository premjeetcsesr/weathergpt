"""
Core Middleware:
- CorrelationIdMiddleware: Generates or propagates X-Request-ID for request tracing.
- SecurityHeadersMiddleware: Appends enterprise HTTP security headers.
- RateLimiterMiddleware: In-memory sliding-window rate limiting for critical routes.
"""

import asyncio
import time
import uuid
from collections import defaultdict
from typing import Callable, Dict, List, Tuple
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import get_settings
from app.core.logging import logger

settings = get_settings()


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware that ensures every request has an X-Request-ID.
    If the client provided one, it is validated and propagated; otherwise a new UUID is generated.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID")
        if not request_id or len(request_id) > 128:
            request_id = str(uuid.uuid4())

        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to append defense-in-depth HTTP security headers to all responses.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Standard Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Enforce HSTS when in production mode
        current_env = getattr(settings, "ENVIRONMENT", "development").lower()
        if current_env == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window in-memory rate limiter for public and sensitive endpoints.
    Tracks requests per client IP and endpoint category over a 60-second window.
    """

    def __init__(self, app):
        super().__init__(app)
        # Store: key -> list of float timestamps
        self._history: Dict[str, List[float]] = defaultdict(list)
        self._lock = asyncio.Lock()

    def _get_client_ip(self, request: Request) -> str:
        # Check standard proxy headers first
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        return request.client.host if request.client else "127.0.0.1"

    def _get_limit_for_path(self, method: str, path: str) -> Tuple[bool, int]:
        """Determine if route is rate-limited and return threshold per minute."""
        if not getattr(settings, "RATE_LIMIT_ENABLED", True):
            return False, 0

        # Skip WebSockets, health, and static docs
        if path.startswith("/api/v1/ws") or path.startswith("/health") or path in ["/docs", "/redoc", "/openapi.json"]:
            return False, 0

        if method == "POST" and "/auth/login" in path:
            return True, getattr(settings, "RATE_LIMIT_LOGIN_PER_MINUTE", 5)

        if method == "POST" and "/auth/register" in path:
            return True, getattr(settings, "RATE_LIMIT_REGISTER_PER_MINUTE", 5)

        if method == "POST" and "/chat" in path:
            return True, getattr(settings, "RATE_LIMIT_CHAT_PER_MINUTE", 30)

        if method == "GET" and ("/weather" in path or "/forecast" in path or "/nowcast" in path):
            return True, getattr(settings, "RATE_LIMIT_WEATHER_PER_MINUTE", 60)

        return False, 0

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        is_limited, limit = self._get_limit_for_path(request.method, request.url.path)
        if not is_limited:
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        rate_key = f"{client_ip}:{request.method}:{request.url.path}"
        now = time.time()
        cutoff = now - 60.0

        async with self._lock:
            # Clean expired timestamps
            timestamps = [ts for ts in self._history[rate_key] if ts > cutoff]
            if len(timestamps) >= limit:
                retry_after = int(60 - (now - timestamps[0]))
                logger.warning(
                    f"Rate limit exceeded for IP {client_ip} on {request.method} {request.url.path}. "
                    f"Count={len(timestamps)}/{limit}, Retry-After={retry_after}s"
                )
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    headers={"Retry-After": str(max(retry_after, 1))},
                    content={
                        "error": {
                            "code": "RATE_LIMIT_EXCEEDED",
                            "message": f"Too many requests. Rate limit is {limit} requests per minute.",
                            "details": {"retry_after_seconds": max(retry_after, 1)},
                        }
                    },
                )

            timestamps.append(now)
            self._history[rate_key] = timestamps

        return await call_next(request)
