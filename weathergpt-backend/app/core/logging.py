import logging
import sys
import time
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


def setup_logging(debug: bool = False) -> logging.Logger:
    """Configure structured console logging for the application."""
    log_level = logging.DEBUG if debug else logging.INFO
    log_format = (
        "%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d - %(message)s"
    )

    logging.basicConfig(
        level=log_level,
        format=log_format,
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )

    # Silence overly verbose external loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    logger = logging.getLogger("weathergpt")
    logger.setLevel(log_level)
    return logger


logger = logging.getLogger("weathergpt")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log incoming requests, responses, and execution duration."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()
        method = request.method
        path = request.url.path
        query = str(request.url.query)

        # Do not log sensitive credentials if query parameters contain them
        sanitized_query = query
        for sensitive_key in ["key", "api_key", "token", "password", "secret", "appid"]:
            if sensitive_key in sanitized_query.lower():
                sanitized_query = "[REDACTED]"
                break

        endpoint_str = f"{path}?{sanitized_query}" if sanitized_query else path

        req_id = getattr(request.state, "request_id", "")
        req_prefix = f"[{req_id}] " if req_id else ""

        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start_time) * 1000
            status_code = response.status_code

            log_message = (
                f"{req_prefix}{method} {endpoint_str} -> {status_code} ({duration_ms:.2f}ms)"
            )
            if status_code >= 500:
                logger.error(log_message)
            elif status_code >= 400:
                logger.warning(log_message)
            else:
                logger.info(log_message)

            return response
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(
                f"{method} {endpoint_str} -> Unhandled Exception: {type(exc).__name__}: {str(exc)} ({duration_ms:.2f}ms)",
                exc_info=True,
            )
            raise
