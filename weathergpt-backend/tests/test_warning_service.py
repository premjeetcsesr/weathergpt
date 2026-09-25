"""
Unit tests for WarningService, severity normalization, ranking, deduplication, and empty states.
"""

import pytest
from app.providers.base import WeatherProvider
from app.schemas.intelligence import WarningSeverity
from app.services.warning_service import WarningService


class WarningMockProvider(WeatherProvider):
    def __init__(self, raw_warnings):
        self.raw_warnings = raw_warnings

    async def get_current_weather(self, city, lat=None, lon=None):
        return {}

    async def get_forecast(self, city, lat=None, lon=None):
        return {}

    async def get_alerts(self, city, lat=None, lon=None):
        return self.raw_warnings

    async def search_locations(self, query, limit=5):
        return []

    async def reverse_geocode(self, lat, lon):
        return None


@pytest.mark.asyncio
async def test_warning_severity_ranking_and_deduplication():
    """Verify warnings are ordered EXTREME > SEVERE > MODERATE > MINOR and duplicates removed."""
    raw = [
        {"alert_id": "a1", "event": "Moderate Rain", "severity": "moderate", "headline": "Moderate rain expected"},
        {"alert_id": "a2", "event": "Super Cyclone", "severity": "extreme", "headline": "Cyclone warning"},
        {"alert_id": "a3", "event": "Severe Thunderstorm", "severity": "severe", "headline": "Severe thunderstorm"},
        {"alert_id": "a2", "event": "Super Cyclone", "severity": "extreme", "headline": "Duplicate cyclone"},  # Duplicate
    ]

    provider = WarningMockProvider(raw)
    service = WarningService(provider=provider)

    res = await service.get_official_warnings("Kanpur")
    assert res.has_active_warnings is True
    assert len(res.warnings) == 3  # Duplicate dropped
    assert res.highest_severity == "extreme"

    # Ordering check: extreme first, then severe, then moderate
    assert res.warnings[0].severity == WarningSeverity.EXTREME
    assert res.warnings[1].severity == WarningSeverity.SEVERE
    assert res.warnings[2].severity == WarningSeverity.MODERATE


@pytest.mark.asyncio
async def test_empty_official_warning_handling():
    """Verify clean empty state when no official warning exists without inventing fake warnings."""
    provider = WarningMockProvider([])
    service = WarningService(provider=provider)

    res = await service.get_official_warnings("Kanpur")
    assert res.has_active_warnings is False
    assert len(res.warnings) == 0
    assert "No active official warning available for this location" in res.message
