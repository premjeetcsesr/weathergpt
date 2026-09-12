import pytest
import pytest_asyncio
from typing import Any, AsyncGenerator, Dict, List, Optional
import httpx
from httpx import ASGITransport
from app.main import app
from app.api.deps import (
    get_alert_service,
    get_forecast_service,
    get_geocoding_service,
    get_weather_provider,
    get_weather_service,
)
from app.providers.base import BaseWeatherProvider
from app.services.alert_service import AlertService
from app.services.forecast_service import ForecastService
from app.services.geocoding_service import GeocodingService
from app.services.weather_service import WeatherService


class MockWeatherProvider(BaseWeatherProvider):
    """Deterministic mock weather provider for testing without live API keys."""

    async def get_current_weather(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Dict[str, Any]:
        if city.lower() == "nonexistentcity12345":
            from app.core.exceptions import LocationNotFoundError
            raise LocationNotFoundError(location=city)

        return {
            "weather": {
                "coord": {"lon": lon or 80.3319, "lat": lat or 26.4499},
                "weather": [
                    {"id": 801, "main": "Partly Cloudy", "description": "few clouds", "icon": "02d"}
                ],
                "main": {
                    "temp": 31.0,
                    "feels_like": 33.0,
                    "temp_min": 24.0,
                    "temp_max": 33.0,
                    "pressure": 1008,
                    "humidity": 78,
                    "sea_level": 126,
                },
                "visibility": 6500,
                "wind": {"speed": 4.4, "deg": 110},
                "clouds": {"all": 65},
                "dt": 1726056000,
                "sys": {"country": "IN", "sunrise": 1726013280, "sunset": 1726057320},
                "timezone": 19800,
                "name": city,
            },
            "air_pollution": {
                "list": [
                    {
                        "main": {"aqi": 3},
                        "components": {"pm2_5": 42.1, "pm10": 95.4},
                    }
                ]
            },
        }

    async def get_forecast(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Dict[str, Any]:
        list_items = []
        for i in range(12):
            list_items.append({
                "dt": 1726056000 + i * 10800,
                "main": {"temp": 28.0 + (i % 5), "humidity": 75},
                "weather": [{"main": "Clouds", "description": "scattered clouds", "icon": "03d"}],
                "wind": {"speed": 4.0},
                "pop": 0.35,
            })

        return {
            "city": {
                "name": city,
                "coord": {"lat": lat or 26.4499, "lon": lon or 80.3319},
                "timezone": 19800,
            },
            "list": list_items,
        }

    async def get_alerts(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        return []

    async def search_locations(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        return [
            {
                "name": query.capitalize(),
                "state": "Uttar Pradesh",
                "country": "India",
                "lat": 26.4499,
                "lon": 80.3319,
            }
        ]

    async def reverse_geocode(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        return {
            "name": "Kanpur",
            "state": "Uttar Pradesh",
            "country": "India",
            "lat": lat,
            "lon": lon,
        }


@pytest.fixture
def mock_provider() -> MockWeatherProvider:
    return MockWeatherProvider()


@pytest_asyncio.fixture
async def async_client(mock_provider: MockWeatherProvider) -> AsyncGenerator[httpx.AsyncClient, None]:
    """Provide AsyncClient with mocked providers overriding FastAPI dependencies."""
    app.dependency_overrides[get_weather_provider] = lambda: mock_provider
    app.dependency_overrides[get_weather_service] = lambda: WeatherService(provider=mock_provider)
    app.dependency_overrides[get_forecast_service] = lambda: ForecastService(provider=mock_provider)
    app.dependency_overrides[get_geocoding_service] = lambda: GeocodingService(provider=mock_provider)
    app.dependency_overrides[get_alert_service] = lambda: AlertService(provider=mock_provider)

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
