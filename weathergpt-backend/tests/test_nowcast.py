"""
Unit tests for NowcastService and short-term precipitation probability.
"""

import pytest
from app.providers.base import WeatherProvider
from app.services.nowcast_service import NowcastService


class NowcastMockProvider(WeatherProvider):
    def __init__(self, available=True):
        self.available = available

    async def get_current_weather(self, city, lat=None, lon=None):
        return {}

    async def get_forecast(self, city, lat=None, lon=None):
        return {}

    async def get_alerts(self, city, lat=None, lon=None):
        return []

    async def get_nowcast(self, city, lat=None, lon=None):
        if not self.available:
            return {"available": False, "source": "MockProvider", "points": []}
        return {
            "available": True,
            "source": "MockProvider",
            "summary": "Next 3 hours: Peak rain probability 75%.",
            "max_rain_probability": 75,
            "points": [
                {
                    "timestamp": "2026-09-13T10:00:00Z",
                    "temperature": 29.5,
                    "condition": "Rain",
                    "precipitation_probability": 75,
                    "rain_mm": 5.2,
                    "wind_speed": 18.0,
                },
                {
                    "timestamp": "2026-09-13T11:00:00Z",
                    "temperature": 28.0,
                    "condition": "Rain",
                    "precipitation_probability": 60,
                    "rain_mm": 2.1,
                    "wind_speed": 14.0,
                },
            ]
        }

    async def search_locations(self, query, limit=5):
        return []

    async def reverse_geocode(self, lat, lon):
        return None


@pytest.mark.asyncio
async def test_nowcast_available_points():
    """Verify nowcast processes available provider points."""
    provider = NowcastMockProvider(available=True)
    service = NowcastService(provider=provider)

    res = await service.get_nowcast("Kanpur")
    assert res.available is True
    assert res.max_rain_probability == 75
    assert len(res.points) == 2
    assert res.points[0].rain_mm == 5.2


@pytest.mark.asyncio
async def test_nowcast_unavailable_handling():
    """Verify clean fallback message when nowcast is unavailable without LLM hallucination."""
    provider = NowcastMockProvider(available=False)
    service = NowcastService(provider=provider)

    res = await service.get_nowcast("Kanpur")
    assert res.available is False
    assert "unavailable" in res.summary.lower()
    assert res.points == []
