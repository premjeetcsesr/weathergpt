"""
Unit tests for AdvisoryService and weather-based safety recommendations.
"""

import pytest
from app.providers.base import WeatherProvider
from app.services.advisory_service import AdvisoryService


class DummyProvider(WeatherProvider):
    async def get_current_weather(self, city, lat=None, lon=None):
        return {}

    async def get_forecast(self, city, lat=None, lon=None):
        return {}

    async def get_alerts(self, city, lat=None, lon=None):
        return []

    async def search_locations(self, query, limit=5):
        return []

    async def reverse_geocode(self, lat, lon):
        return None


def test_advisory_generation_heavy_rain():
    """Verify rainfall triggers precipitation and travel advisories."""
    service = AdvisoryService(provider=DummyProvider())
    items = service.generate_advisories_from_metrics(
        city="Kanpur",
        temperature=28.0,
        condition="Heavy Rain",
        rain_probability=85,
        wind_speed=15.0,
        humidity=88,
    )

    categories = [it.category for it in items]
    assert "Precipitation & Travel" in categories
    item = next(it for it in items if it.category == "Precipitation & Travel")
    assert any("umbrella" in r.lower() for r in item.recommendations)
    assert any("waterlogging" in r.lower() for r in item.recommendations)


def test_advisory_generation_heatwave():
    """Verify high temperatures trigger heat & hydration precautions."""
    service = AdvisoryService(provider=DummyProvider())
    items = service.generate_advisories_from_metrics(
        city="Kanpur",
        temperature=42.5,
        condition="Clear",
        rain_probability=0,
        wind_speed=8.0,
        humidity=30,
    )

    categories = [it.category for it in items]
    assert "Heat & Hydration" in categories
    item = next(it for it in items if it.category == "Heat & Hydration")
    assert any("hydration" in r.lower() or "water" in r.lower() for r in item.recommendations)
