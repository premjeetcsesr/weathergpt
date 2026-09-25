from typing import Any, Dict, Optional
from fastapi import status


class AppException(Exception):
    """Base application exception with status code, error code and message."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_SERVER_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}


class LocationNotFoundError(AppException):
    """Raised when a specified city or location cannot be found."""

    def __init__(self, location: str):
        super().__init__(
            message=f"Location '{location}' could not be found.",
            code="LOCATION_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"location": location},
        )


class WeatherProviderError(AppException):
    """Raised when the weather data provider returns an error or fails."""

    def __init__(self, message: str = "Failed to fetch weather data from provider."):
        super().__init__(
            message=message,
            code="WEATHER_PROVIDER_ERROR",
            status_code=status.HTTP_502_BAD_GATEWAY,
        )


class WeatherProviderTimeoutError(AppException):
    """Raised when the external weather provider request times out."""

    def __init__(self, message: str = "Weather service provider request timed out."):
        super().__init__(
            message=message,
            code="PROVIDER_TIMEOUT",
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        )


class LLMServiceError(AppException):
    """Raised when the LLM service fails to generate a response."""

    def __init__(self, message: str = "AI assistant service encountered an error."):
        super().__init__(
            message=message,
            code="LLM_SERVICE_ERROR",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class MissingAPIKeyError(AppException):
    """Raised when an external API key is required but missing."""

    def __init__(self, provider: str = "Weather"):
        super().__init__(
            message=f"{provider} API key is not configured.",
            code="API_KEY_MISSING",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details={"provider": provider},
        )
