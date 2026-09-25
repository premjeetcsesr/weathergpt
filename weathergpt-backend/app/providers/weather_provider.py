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
            # Fallback 1: Strip administrative suffixes (e.g. 'Kanpur Nagar' -> 'Kanpur', 'Lucknow District' -> 'Lucknow')
            import re
            cleaned_city = re.sub(r'(?i)\s+(nagar|district|city|urban|rural)$', '', city).strip()
            if cleaned_city and cleaned_city.lower() != city.lower():
                try:
                    return await self.get_current_weather(city=cleaned_city)
                except Exception:
                    pass

            # Fallback 2: Geocoding lookup for coordinate resolution
            if lat is None or lon is None:
                try:
                    geo_items = await self.search_locations(query=city, limit=1)
                    if geo_items:
                        geo_lat = float(geo_items[0].get("lat", 0.0))
                        geo_lon = float(geo_items[0].get("lon", 0.0))
                        return await self.get_current_weather(city=city, lat=geo_lat, lon=geo_lon)
                except Exception:
                    pass

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
            # Fallback 1: Strip administrative suffixes
            import re
            cleaned_city = re.sub(r'(?i)\s+(nagar|district|city|urban|rural)$', '', city).strip()
            if cleaned_city and cleaned_city.lower() != city.lower():
                try:
                    return await self.get_forecast(city=cleaned_city)
                except Exception:
                    pass

            # Fallback 2: Geocoding lookup for coordinate resolution
            if lat is None or lon is None:
                try:
                    geo_items = await self.search_locations(query=city, limit=1)
                    if geo_items:
                        geo_lat = float(geo_items[0].get("lat", 0.0))
                        geo_lon = float(geo_items[0].get("lon", 0.0))
                        return await self.get_forecast(city=city, lat=geo_lat, lon=geo_lon)
                except Exception:
                    pass

            raise LocationNotFoundError(location=city)
        if response.status_code == 401:
            raise WeatherProviderError("Weather provider authentication failed.")
        if response.status_code != 200:
            raise WeatherProviderError(f"Forecast provider returned status {response.status_code}.")

        return response.json()

    def _normalize_alert(self, raw: Dict[str, Any], default_source: str = "OpenWeatherMap") -> Dict[str, Any]:
        """Normalize raw meteorological provider alert payload into standard format."""
        import hashlib
        alert_id = str(raw.get("alert_id") or raw.get("id") or raw.get("sender_name") or "")
        if not alert_id:
            # Generate deterministic fallback ID from event + start time
            base = f"{raw.get('event', 'alert')}-{raw.get('start', '')}-{raw.get('end', '')}"
            alert_id = f"alert-{hashlib.md5(base.encode()).hexdigest()[:12]}"

        # Normalize severity to minor / moderate / severe / extreme
        raw_sev = str(raw.get("severity", "moderate")).lower()
        if raw_sev not in ("minor", "moderate", "severe", "extreme"):
            if any(k in raw_sev for k in ("high", "severe", "warning", "red")):
                raw_sev = "severe"
            elif any(k in raw_sev for k in ("extreme", "critical", "danger")):
                raw_sev = "extreme"
            elif any(k in raw_sev for k in ("info", "watch", "yellow", "low")):
                raw_sev = "minor"
            else:
                raw_sev = "moderate"

        return {
            "alert_id": alert_id,
            "event": str(raw.get("event") or raw.get("title") or "Weather Advisory"),
            "severity": raw_sev,
            "urgency": str(raw.get("urgency", "expected")).lower(),
            "headline": str(raw.get("headline") or raw.get("event") or "Weather Advisory in Effect"),
            "description": str(raw.get("description", "")),
            "instruction": str(raw.get("instruction") or raw.get("safety_recommendation") or ""),
            "starts_at": raw.get("starts_at") or raw.get("start_time") or raw.get("start"),
            "ends_at": raw.get("ends_at") or raw.get("end_time") or raw.get("end"),
            "source": str(raw.get("source") or raw.get("sender_name") or default_source),
        }

    async def get_alerts(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch active meteorological warnings/alerts for a location.
        Adheres to safety rules:
        - NEVER fabricates government or IMD warnings.
        - OpenWeatherMap 2.5 does not provide official government warnings; returns empty list unless
          official alerts are returned by the upstream provider.
        - Catches timeouts and API failures gracefully.
        """
        # If coordinates are missing, resolve them via geocoding if possible
        client = await self._get_client()
        api_key = self.settings.WEATHER_API_KEY
        if not api_key:
            return []

        resolved_lat = lat
        resolved_lon = lon
        if resolved_lat is None or resolved_lon is None:
            try:
                geo_locations = await self.search_locations(query=city, limit=1)
                if geo_locations:
                    resolved_lat = geo_locations[0].get("lat")
                    resolved_lon = geo_locations[0].get("lon")
            except Exception as exc:
                logger.warning(f"Could not resolve coordinates for '{city}' for alerts check: {exc}")

        # Check One Call / alert endpoint if configured or coordinates available
        if resolved_lat is not None and resolved_lon is not None:
            onecall_url = f"{self.settings.WEATHER_API_BASE_URL}/onecall"
            try:
                res = await client.get(
                    onecall_url,
                    params={"lat": str(resolved_lat), "lon": str(resolved_lon), "appid": api_key, "exclude": "current,minutely,hourly,daily"}
                )
                if res.status_code == 200:
                    data = res.json()
                    raw_alerts = data.get("alerts", [])
                    if isinstance(raw_alerts, list):
                        return [self._normalize_alert(a) for a in raw_alerts]
            except httpx.TimeoutException:
                logger.warning(f"Alert fetch timed out for ({resolved_lat}, {resolved_lon}). Returning empty list.")
                return []
            except Exception as exc:
                logger.debug(f"Alert fetch from provider returned no alerts or not available: {exc}")

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
