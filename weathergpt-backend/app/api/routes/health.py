from typing import Dict
from fastapi import APIRouter
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


@router.get("/health", summary="Health Check", response_model=Dict[str, str])
async def health_check() -> Dict[str, str]:
    """System health check probe."""
    return {
        "status": "healthy"
    }
