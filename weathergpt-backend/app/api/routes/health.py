from typing import Any, Dict
from fastapi import APIRouter, Response, status
from fastapi.responses import JSONResponse
from app.core.config import get_settings

router = APIRouter(tags=["Health"])
settings = get_settings()


@router.get("/", summary="Root Status Endpoint", response_model=Dict[str, str])
async def root() -> Dict[str, str]:
    """Root entry point confirming API status."""
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "running"
    }


@router.get("/health", summary="Liveness Health Check", response_model=Dict[str, str])
async def health_check() -> Dict[str, str]:
    """System liveness check probe."""
    return {
        "status": "healthy"
    }


@router.get("/health/ready", summary="Readiness Probe", response_model=Dict[str, Any])
async def readiness_check() -> Dict[str, Any]:
    """
    Production readiness probe.
    Verifies database connectivity, active provider status, and service health.
    Returns 200 if operational or 503 if critical dependencies are unreachable.
    """
    from fastapi import Response, status
    from app.db.mongodb import get_mongo_database
    from app.providers.provider_factory import ProviderFactory

    readiness = {
        "status": "ready",
        "database": "unknown",
        "weather_provider": "available",
        "environment": settings.ENVIRONMENT,
    }

    is_ready = True

    # 1. Check MongoDB connectivity
    try:
        db = get_mongo_database()
        if db is not None:
            await db.command("ping")
            readiness["database"] = "connected"
        else:
            readiness["database"] = "disconnected"
            is_ready = False
    except Exception as exc:
        readiness["database"] = f"error: {type(exc).__name__}"
        is_ready = False

    # 2. Check Provider status
    try:
        provider = ProviderFactory.create_provider(settings=settings)
        readiness["active_provider"] = provider.provider_name
    except Exception as exc:
        readiness["weather_provider"] = f"error: {type(exc).__name__}"
        is_ready = False

    if not is_ready:
        readiness["status"] = "degraded"
        return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content=readiness)

    return readiness

