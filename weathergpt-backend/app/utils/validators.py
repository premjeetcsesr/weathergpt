import re
from typing import Optional, Tuple
from app.core.exceptions import AppException
from fastapi import status


def validate_city_name(city: Optional[str]) -> str:
    """Validate and sanitize city query parameter."""
    if not city or not city.strip():
        raise AppException(
            message="City name parameter cannot be empty.",
            code="INVALID_QUERY_PARAMETER",
            status_code=status.HTTP_400_BAD_REQUEST,
            details={"parameter": "city"},
        )
    cleaned = city.strip()
    if len(cleaned) < 1 or len(cleaned) > 100:
        raise AppException(
            message="City name must be between 1 and 100 characters.",
            code="INVALID_QUERY_PARAMETER",
            status_code=status.HTTP_400_BAD_REQUEST,
            details={"parameter": "city", "value": cleaned},
        )
    # Basic check for disallowing purely punctuation or illegal characters
    if not re.search(r"[\w\u00C0-\u024F\u0900-\u097F]", cleaned):
        raise AppException(
            message="Invalid city name format.",
            code="INVALID_QUERY_PARAMETER",
            status_code=status.HTTP_400_BAD_REQUEST,
            details={"parameter": "city", "value": cleaned},
        )
    return cleaned


def validate_coordinates(lat: float, lon: float) -> Tuple[float, float]:
    """Validate latitude and longitude ranges."""
    if not (-90.0 <= lat <= 90.0):
        raise AppException(
            message=f"Latitude {lat} is out of bounds (-90 to +90).",
            code="INVALID_COORDINATES",
            status_code=status.HTTP_400_BAD_REQUEST,
            details={"latitude": lat},
        )
    if not (-180.0 <= lon <= 180.0):
        raise AppException(
            message=f"Longitude {lon} is out of bounds (-180 to +180).",
            code="INVALID_COORDINATES",
            status_code=status.HTTP_400_BAD_REQUEST,
            details={"longitude": lon},
        )
    return lat, lon
