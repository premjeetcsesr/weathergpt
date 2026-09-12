import asyncio
from typing import Any, Dict, List, Optional
import httpx
from app.core.config import Settings, get_settings
from app.core.exceptions import (
    LocationNotFoundError,
    MissingAPIKeyError,
    WeatherProviderError,
    WeatherProviderTimeoutError,
)
from app.core.logging import logger
from app.providers.base import BaseWeatherProvider


class OpenWeatherMapProvider(BaseWeatherProvider):
    """OpenWeatherMap implementation of the BaseWeatherProvider."""

    def __init__(self, settings: Optional[Settings] = None, client: Optional[httpx.AsyncClient] = None):
        self.settings = settings or get_settings()
        self._client = client
        self.timeout = self.settings.HTTP_TIMEOUT_SECONDS

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is not None and not self._client.is_closed:
            return self._client
        return httpx.AsyncClient(timeout=self.timeout)

    def _ensure_api_key(self) -> str:
        api_key = self.settings.WEATHER_API_KEY
        if not api_key or not api_key.strip():
            logger.error("OpenWeatherMap API key is not configured in settings.")
            raise MissingAPIKeyError(provider="OpenWeatherMap")
        return api_key.strip()

    async def get_current_weather(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Dict[str, Any]:
        """Fetch live current weather and air pollution from OpenWeatherMap."""
        api_key = self._ensure_api_key()
        client = await self._get_client()

        params = {"units": "metric", "appid": api_key}
        if lat is not None and lon is not None:
            params["lat"] = str(lat)
            params["lon"] = str(lon)
        else:
            params["q"] = city

        url = f"{self.settings.WEATHER_API_BASE_URL}/weather"

        try:
            response = await client.get(url, params=params)
        except httpx.TimeoutException as exc:
            logger.error(f"Timeout fetching weather for '{city}': {exc}")
            raise WeatherProviderTimeoutError(f"Request to weather provider timed out for '{city}'.")
        except httpx.RequestError as exc:
            logger.error(f"Network error fetching weather for '{city}': {exc}")
            raise WeatherProviderError(f"Network error communicating with weather provider: {exc}")

        if response.status_code == 404:
            raise LocationNotFoundError(location=city)
        if response.status_code == 401:
            logger.error("OpenWeatherMap API key invalid or unauthorized.")
            raise WeatherProviderError("Weather provider authentication failed. Please check API key.")
        if response.status_code != 200:
            logger.error(f"OpenWeatherMap error status {response.status_code}: {response.text}")
            raise WeatherProviderError(f"Provider returned error status {response.status_code}.")

        weather_json = response.json()

        # Fetch Air Pollution in parallel if coordinates are present
        res_lat = weather_json.get("coord", {}).get("lat")
        res_lon = weather_json.get("coord", {}).get("lon")

        air_json = None
        if res_lat is not None and res_lon is not None:
            air_json = await self._fetch_air_pollution(client, res_lat, res_lon, api_key)

        return {
            "weather": weather_json,
            "air_pollution": air_json,
        }

    async def _fetch_air_pollution(
        self,
        client: httpx.AsyncClient,
        lat: float,
        lon: float,
        api_key: str
    ) -> Optional[Dict[str, Any]]:
        """Fetch air pollution telemetry asynchronously."""
        url = f"{self.settings.WEATHER_API_BASE_URL}/air_pollution"
        try:
            res = await client.get(url, params={"lat": str(lat), "lon": str(lon), "appid": api_key})
            if res.status_code == 200:
                return res.json()
        except Exception as exc:
            logger.warning(f"Could not fetch air pollution for coordinates ({lat}, {lon}): {exc}")
        return None

    async def get_forecast(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Dict[str, Any]:
        """Fetch 5-day / 3-hour forecast from OpenWeatherMap."""
        api_key = self._ensure_api_key()
        client = await self._get_client()

        params = {"units": "metric", "appid": api_key}
        if lat is not None and lon is not None:
            params["lat"] = str(lat)
            params["lon"] = str(lon)
        else:
            params["q"] = city

        url = f"{self.settings.WEATHER_API_BASE_URL}/forecast"

        try:
            response = await client.get(url, params=params)
        except httpx.TimeoutException as exc:
            logger.error(f"Timeout fetching forecast for '{city}': {exc}")
            raise WeatherProviderTimeoutError(f"Forecast request timed out for '{city}'.")
        except httpx.RequestError as exc:
            logger.error(f"Network error fetching forecast for '{city}': {exc}")
            raise WeatherProviderError(f"Network error fetching forecast: {exc}")

        if response.status_code == 404:
            raise LocationNotFoundError(location=city)
        if response.status_code == 401:
            raise WeatherProviderError("Weather provider authentication failed.")
        if response.status_code != 200:
            raise WeatherProviderError(f"Forecast provider returned status {response.status_code}.")

        return response.json()

    async def get_alerts(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch weather alerts.
        NOTE: Standard OpenWeatherMap 2.5 free API does not supply government weather warning alerts.
        We return an empty list when standard OWM is in use and never fabricate government warnings.
        """
        # If One Call 3.0 or emergency warning endpoint becomes configured in future phases,
        # it will be queried here.
        return []

    async def search_locations(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search locations matching query via OpenWeather Direct Geocoding API."""
        api_key = self._ensure_api_key()
        client = await self._get_client()

        url = f"{self.settings.GEOCODING_API_BASE_URL}/direct"
        params = {"q": query, "limit": str(limit), "appid": api_key}

        try:
            response = await client.get(url, params=params)
        except httpx.TimeoutException:
            raise WeatherProviderTimeoutError("Geocoding search request timed out.")
        except httpx.RequestError as exc:
            raise WeatherProviderError(f"Geocoding request failed: {exc}")

        if response.status_code != 200:
            logger.warning(f"Geocoding returned status {response.status_code}: {response.text}")
            return []

        data = response.json()
        if isinstance(data, list):
            return data
        return []

    async def reverse_geocode(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """Resolve city metadata from coordinates via OpenWeather Reverse Geocoding API."""
        api_key = self._ensure_api_key()
        client = await self._get_client()

        url = f"{self.settings.GEOCODING_API_BASE_URL}/reverse"
        params = {"lat": str(lat), "lon": str(lon), "limit": "1", "appid": api_key}

        try:
            response = await client.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    return data[0]
        except Exception as exc:
            logger.warning(f"Reverse geocode failed for ({lat}, {lon}): {exc}")
        return None
