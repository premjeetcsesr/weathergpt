from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """Detailed error object returned on API failures."""

    code: str = Field(..., description="Machine-readable uppercase error code", examples=["LOCATION_NOT_FOUND"])
    message: str = Field(..., description="Human-readable explanation of error", examples=["Could not find weather location."])
    details: Optional[Dict[str, Any]] = Field(default=None, description="Optional extra error metadata")


class ErrorResponse(BaseModel):
    """Unified API error response wrapper."""

    error: ErrorDetail
