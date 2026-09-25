"""
Official India Meteorological Department (IMD) Provider Architecture.
Provides an isolated integration layer for official Indian meteorological feeds,
adhering to government data standards and strict data honesty rules.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import Settings, get_settings
from app.core.exceptions import WeatherProviderError
from app.core.logging import logger
from app.providers.base import WeatherProvider


class IMDProvider(WeatherProvider):
    """
    Official IMD Weather Provider.
    Interfaces with national meteorological services when configured with
    IMD_API_BASE_URL and IMD_API_KEY environment variables.

    If credentials or endpoints are unconfigured, returns an explicit,
    transparent unconfigured status rather than fabricating government data.
    """

    def __init__(self, settings: Optional[Settings] = None, client: Optional[httpx.AsyncClient] = None):
        self.settings = settings or get_settings()
        self._client = client
        self.api_base_url = (self.settings.IMD_API_BASE_URL or "").strip()
        self.api_key = (self.settings.IMD_API_KEY or "").strip()
        self.timeout = self.settings.HTTP_TIMEOUT_SECONDS

    @property
    def provider_name(self) -> str:
        return "IMD"

    @property
    def is_configured(self) -> bool:
        """Returns True only when real IMD endpoint and credentials are provided."""
        return bool(self.api_base_url and self.api_key)

    def _unconfigured_response(self, operation: str, location: Optional[str] = None) -> Dict[str, Any]:
        """Generate standardized unconfigured response to prevent fake data generation."""
        return {
            "configured": False,
            "data_available": False,
            "source": "IMD",
            "operation": operation,
            "location": location,
            "message": (
                "Official IMD provider is not configured in this environment. "
                "Set IMD_API_BASE_URL and IMD_API_KEY to activate live official IMD telemetry."
            ),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is not None and not self._client.is_closed:
            return self._client
        return httpx.AsyncClient(timeout=self.timeout)

    async def get_current_weather(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Fetch current observational weather from IMD station network.
        If unconfigured, raises WeatherProviderError with clear status.
        """
        if not self.is_configured:
            logger.info(f"IMD Provider unconfigured for current_weather query: '{city}'")
            raise WeatherProviderError(
                "Official IMD provider is not configured in this environment. "
                "Configure IMD_API_BASE_URL and IMD_API_KEY."
            )

        client = await self._get_client()
        url = f"{self.api_base_url}/city_weather"
        headers = {"X-API-KEY": self.api_key}
        params = {"city": city}
        if lat is not None and lon is not None:
            params["lat"] = str(lat)
            params["lon"] = str(lon)

        try:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code != 200:
                raise WeatherProviderError(f"IMD API returned HTTP status {resp.status_code}")
            return resp.json()
        except Exception as exc:
            logger.error(f"IMD API request failed: {exc}")
            raise WeatherProviderError(f"IMD provider communication failure: {exc}")

    async def get_forecast(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Dict[str, Any]:
        """Fetch 7-day district meteorological forecast from IMD."""
        if not self.is_configured:
            raise WeatherProviderError("Official IMD provider is not configured.")

        client = await self._get_client()
        url = f"{self.api_base_url}/district_forecast"
        headers = {"X-API-KEY": self.api_key}
        params = {"city": city}
        if lat is not None and lon is not None:
            params["lat"] = str(lat)
            params["lon"] = str(lon)

        resp = await client.get(url, params=params, headers=headers)
        if resp.status_code != 200:
            raise WeatherProviderError(f"IMD forecast returned status {resp.status_code}")
        return resp.json()

    async def get_alerts(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """Fetch official meteorological alerts/bulletins from IMD."""
        if not self.is_configured:
            # Return empty list when unconfigured; never invent government warnings
            return []

        client = await self._get_client()
        url = f"{self.api_base_url}/warnings"
        headers = {"X-API-KEY": self.api_key}
        params = {"city": city}
        if lat is not None and lon is not None:
            params["lat"] = str(lat)
            params["lon"] = str(lon)

        try:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                return resp.json().get("warnings", [])
        except Exception as exc:
            logger.warning(f"Failed to fetch official IMD warnings: {exc}")
        return []

    async def get_nowcast(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Dict[str, Any]:
        """Fetch IMD 3-hour short-term nowcast (thunderstorm, lightning, gale)."""
        if not self.is_configured:
            return {
                "available": False,
                "configured": False,
                "source": "IMD",
                "message": "Official IMD nowcast provider is not configured in this environment.",
                "location": {"name": city, "lat": lat, "lon": lon},
                "points": [],
            }

        client = await self._get_client()
        url = f"{self.api_base_url}/nowcast"
        headers = {"X-API-KEY": self.api_key}
        params = {"city": city}

        try:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                data["source"] = "IMD"
                data["available"] = True
                return data
        except Exception as exc:
            logger.warning(f"IMD nowcast fetch failed: {exc}")

        return {
            "available": False,
            "source": "IMD",
            "message": "Short-term nowcast is currently unavailable from IMD for this station.",
            "location": {"name": city, "lat": lat, "lon": lon},
            "points": [],
        }

    async def search_locations(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search Indian districts and observatory stations."""
        if not self.is_configured:
            return []
        return []

    async def reverse_geocode(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """Resolve station from coordinates."""
        return None
