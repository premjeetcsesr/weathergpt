"""
Unit tests for SevereWeatherService risk evaluation thresholds.
"""

import pytest
from app.providers.base import WeatherProvider
from app.schemas.intelligence import WarningSeverity
from app.services.severe_weather_service import SevereWeatherService


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


def test_severe_weather_heatwave_risk():
    """Verify temperature >= 44°C triggers EXTREME heatwave risk."""
    service = SevereWeatherService(provider=DummyProvider())
    risks = service.analyze_severe_risks(
        city="Kanpur",
        current_weather={"temperature": 45.0, "feels_like": 49.0, "wind_speed": 10.0, "condition": "Clear"},
    )

    types = [r.risk_type for r in risks]
    assert "heatwave" in types
    heat = next(r for r in risks if r.risk_type == "heatwave")
    assert heat.severity == WarningSeverity.EXTREME


def test_severe_weather_thunderstorm_risk():
    """Verify thunderstorm condition triggers SEVERE risk."""
    service = SevereWeatherService(provider=DummyProvider())
    risks = service.analyze_severe_risks(
        city="Kanpur",
        current_weather={"temperature": 27.0, "feels_like": 28.0, "wind_speed": 35.0, "condition": "Thunderstorm with heavy rain"},
    )

    types = [r.risk_type for r in risks]
    assert "thunderstorm" in types
    t_risk = next(r for r in risks if r.risk_type == "thunderstorm")
    assert t_risk.severity == WarningSeverity.SEVERE
