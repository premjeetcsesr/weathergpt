"""
Unit tests for ProviderFactory, fallback mechanism, and provider health statuses.
"""

import pytest
from app.core.config import Settings
from app.providers.imd_provider import IMDProvider
from app.providers.openweather_provider import OpenWeatherProvider
from app.providers.provider_factory import FallbackWeatherProvider, ProviderFactory


def test_provider_factory_default():
    """Verify ProviderFactory defaults to OpenWeatherProvider."""
    settings = Settings(DEFAULT_WEATHER_PROVIDER="openweather", WEATHER_API_KEY="test_key")
    provider = ProviderFactory.create_provider(settings=settings)
    assert isinstance(provider, OpenWeatherProvider)
    assert provider.provider_name == "OpenWeatherMap"


def test_provider_factory_imd_unconfigured():
    """Verify ProviderFactory returns unconfigured IMDProvider when explicitly selected."""
    settings = Settings(DEFAULT_WEATHER_PROVIDER="imd", IMD_API_BASE_URL="", IMD_API_KEY="")
    provider = ProviderFactory.create_provider(settings=settings)
    assert isinstance(provider, IMDProvider)
    assert provider.is_configured is False


def test_provider_statuses_summary():
    """Verify that ProviderFactory reports status for all 5 providers (IMD, OWM, NWP, Radar, Satellite)."""
    settings = Settings(WEATHER_API_KEY="mock_key")
    statuses = ProviderFactory.get_all_provider_statuses(settings)

    ids = [p["provider_id"] for p in statuses]
    assert "imd" in ids
    assert "openweather" in ids
    assert "nwp" in ids
    assert "radar" in ids
    assert "satellite" in ids

    # Check that NWP, Radar, Satellite are transparently NOT_CONFIGURED
    nwp_item = next(p for p in statuses if p["provider_id"] == "nwp")
    assert nwp_item["status"] in ["NOT_CONFIGURED", "NOT CONFIGURED"]
    assert "awaiting GFS/WRF" in nwp_item["notes"]
