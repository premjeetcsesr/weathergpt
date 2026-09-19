from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import Settings, get_settings
from app.core.exceptions import LocationNotFoundError, MissingAPIKeyError, WeatherProviderError, WeatherProviderTimeoutError
from app.providers.base import BaseWeatherProvider


class VisualCrossingProvider(BaseWeatherProvider):
    """Visual Crossing Timeline API adapter normalized to the provider contract."""

    def __init__(self, settings: Optional[Settings] = None, client: Optional[httpx.AsyncClient] = None):
        self.settings = settings or get_settings()
        self._client = client
        self.timeout = self.settings.HTTP_TIMEOUT_SECONDS

    @property
    def provider_name(self) -> str:
        return "Visual Crossing"

    @property
    def is_configured(self) -> bool:
        return bool(self.settings.VISUAL_CROSSING_API_KEY)

    def _key(self) -> str:
        if not self.settings.VISUAL_CROSSING_API_KEY:
            raise MissingAPIKeyError(provider=self.provider_name)
        return self.settings.VISUAL_CROSSING_API_KEY.strip()

    async def _request(self, location: str, include: str = "current,days,hours,alerts") -> Dict[str, Any]:
        url = f"{self.settings.VISUAL_CROSSING_API_BASE_URL}/{location}"
        params = {
            "key": self._key(),
            "unitGroup": "metric",
            "include": include,
            "contentType": "json",
        }
        client = self._client or httpx.AsyncClient(timeout=self.timeout)
        try:
            response = await client.get(url, params=params)
        except httpx.TimeoutException as exc:
            raise WeatherProviderTimeoutError("Visual Crossing request timed out.") from exc
        except httpx.RequestError as exc:
            raise WeatherProviderError("Network error communicating with Visual Crossing.") from exc
        finally:
            if self._client is None:
                await client.aclose()

        if response.status_code in (400, 404):
            raise LocationNotFoundError(location=location)
        if response.status_code in (401, 403):
            raise WeatherProviderError("Visual Crossing API key is invalid or unauthorized.")
        if response.status_code != 200:
            raise WeatherProviderError(f"Visual Crossing returned status {response.status_code}.")
        return response.json()

    @staticmethod
    def _epoch(value: Optional[str]) -> int:
        if not value:
            return 0
        return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp())

    @staticmethod
    def _condition_icon(condition: str) -> str:
        value = condition.lower()
        if "thunder" in value:
            return "11d"
        if "snow" in value:
            return "13d"
        if "rain" in value or "drizzle" in value:
            return "10d"
        if "cloud" in value or "overcast" in value:
            return "03d"
        if "fog" in value:
            return "50d"
        return "01d"

    def _current_payload(self, data: Dict[str, Any], city: str) -> Dict[str, Any]:
        current = data.get("currentConditions", {})
        address = data.get("resolvedAddress") or data.get("address") or city
        location = data.get("latitude"), data.get("longitude")
        weather = {
            "name": address.split(",")[0].strip(),
            "coord": {"lat": location[0] or 0.0, "lon": location[1] or 0.0},
            "sys": {
                "country": "",
                "sunrise": self._epoch(current.get("sunrise")),
                "sunset": self._epoch(current.get("sunset")),
            },
            "main": {
                "temp": current.get("temp", 0.0),
                "feels_like": current.get("feelslike", current.get("temp", 0.0)),
                "temp_min": current.get("temp", 0.0),
                "temp_max": current.get("temp", 0.0),
                "humidity": current.get("humidity", 0),
                "pressure": current.get("pressure", 0),
                "sea_level": None,
            },
            "weather": [{
                "main": current.get("conditions", "Unknown").split(",")[0],
                "description": current.get("conditions", "Unknown"),
                "icon": self._condition_icon(current.get("conditions", "")),
            }],
            "wind": {
                "speed": float(current.get("windspeed", 0.0)) / 3.6,
                "deg": current.get("winddir"),
            },
            "clouds": {"all": current.get("cloudcover", 0)},
            "visibility": float(current.get("visibility", 0.0)) * 1_609.344,
            "timezone": 0,
        }
        air = None
        if current.get("pm25") is not None or current.get("pm10") is not None:
            air = {"list": [{"main": {"aqi": 2}, "components": {
                "pm2_5": current.get("pm25", 0.0),
                "pm10": current.get("pm10", 0.0),
            }}]}
        return {"weather": weather, "air_pollution": air}

    async def get_current_weather(self, city: str, lat: Optional[float] = None, lon: Optional[float] = None) -> Dict[str, Any]:
        location = f"{lat},{lon}" if lat is not None and lon is not None else city
        return self._current_payload(await self._request(location, "current,alerts"), city)

    async def get_forecast(self, city: str, lat: Optional[float] = None, lon: Optional[float] = None) -> Dict[str, Any]:
        location = f"{lat},{lon}" if lat is not None and lon is not None else city
        data = await self._request(location, "days,hours")
        items: List[Dict[str, Any]] = []
        for day in data.get("days", [])[:7]:
            for hour in day.get("hours", []):
                timestamp = self._epoch(f"{day.get('datetime')}T{hour.get('datetime')}")
                items.append({
                    "dt": timestamp,
                    "main": {
                        "temp": hour.get("temp", 0.0),
                        "humidity": hour.get("humidity", 0),
                    },
                    "weather": [{
                        "main": hour.get("conditions", "Unknown").split(",")[0],
                        "description": hour.get("conditions", "Unknown"),
                        "icon": self._condition_icon(hour.get("conditions", "")),
                    }],
                    "pop": float(hour.get("precipprob", 0.0)) / 100,
                    "wind": {"speed": float(hour.get("windspeed", 0.0)) / 3.6},
                })
        return {
            "city": {
                "name": (data.get("resolvedAddress") or city).split(",")[0].strip(),
                "coord": {"lat": data.get("latitude"), "lon": data.get("longitude")},
                "timezone": 0,
            },
            "list": items,
        }

    async def get_alerts(self, city: str, lat: Optional[float] = None, lon: Optional[float] = None) -> List[Dict[str, Any]]:
        location = f"{lat},{lon}" if lat is not None and lon is not None else city
        data = await self._request(location, "alerts")
        return data.get("alerts", [])

    async def search_locations(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        data = await self._request(query, "current")
        return [{
            "name": data.get("resolvedAddress", query),
            "lat": data.get("latitude"),
            "lon": data.get("longitude"),
        }]

    async def reverse_geocode(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        data = await self._request(f"{lat},{lon}", "current")
        return {
            "name": data.get("resolvedAddress"),
            "lat": data.get("latitude"),
            "lon": data.get("longitude"),
        }
