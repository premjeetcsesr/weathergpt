"""
Unit tests for IMDProvider isolation, configuration checks, and honest unconfigured handling.
"""

import pytest
from app.core.config import Settings
from app.core.exceptions import WeatherProviderError
from app.providers.imd_provider import IMDProvider


@pytest.mark.asyncio
async def test_imd_unconfigured_status():
    """Verify that IMDProvider correctly detects missing credentials without fabricating endpoints."""
    settings = Settings(IMD_API_BASE_URL="", IMD_API_KEY="")
    provider = IMDProvider(settings=settings)

    assert provider.provider_name == "IMD"
    assert provider.is_configured is False


@pytest.mark.asyncio
async def test_imd_unconfigured_error_on_fetch():
    """Verify that attempting to fetch current weather on unconfigured IMD raises WeatherProviderError."""
    settings = Settings(IMD_API_BASE_URL="", IMD_API_KEY="")
    provider = IMDProvider(settings=settings)

    with pytest.raises(WeatherProviderError) as exc_info:
        await provider.get_current_weather("Kanpur")

    assert "Official IMD provider is not configured" in str(exc_info.value)


@pytest.mark.asyncio
async def test_imd_unconfigured_nowcast_and_alerts():
    """Verify that unconfigured IMD provider returns structured unconfigured nowcast and zero fake alerts."""
    settings = Settings(IMD_API_BASE_URL="", IMD_API_KEY="")
    provider = IMDProvider(settings=settings)

    alerts = await provider.get_alerts("Kanpur")
    assert alerts == []

    nowcast = await provider.get_nowcast("Kanpur")
    assert nowcast["available"] is False
    assert nowcast["configured"] is False
    assert "not configured" in nowcast["message"]
