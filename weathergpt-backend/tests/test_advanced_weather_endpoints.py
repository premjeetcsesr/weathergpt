"""
Integration tests for Step 7 Advanced Weather API endpoints.
"""

import pytest
import httpx


@pytest.mark.asyncio
async def test_advanced_weather_endpoint(async_client: httpx.AsyncClient):
    """Verify /api/v1/weather/advanced returns unified intelligence package."""
    response = await async_client.get("/api/v1/weather/advanced?city=Kanpur")
    assert response.status_code == 200
    data = response.json()

    assert data["location"]["name"] == "Kanpur"
    assert "source" in data
    assert "current" in data
    assert "warnings" in data
    assert "nowcast" in data
    assert "severe_weather" in data
    assert "advisory" in data
    assert data["data_available"] is True


@pytest.mark.asyncio
async def test_nowcast_endpoint(async_client: httpx.AsyncClient):
    """Verify /api/v1/weather/nowcast returns nowcast schema."""
    response = await async_client.get("/api/v1/weather/nowcast?city=Kanpur")
    assert response.status_code == 200
    data = response.json()
    assert "available" in data
    assert "summary" in data


@pytest.mark.asyncio
async def test_warnings_endpoint(async_client: httpx.AsyncClient):
    """Verify /api/v1/weather/warnings handles location warnings."""
    response = await async_client.get("/api/v1/weather/warnings?city=Kanpur")
    assert response.status_code == 200
    data = response.json()
    assert "has_active_warnings" in data
    assert "warnings" in data


@pytest.mark.asyncio
async def test_severe_weather_endpoint(async_client: httpx.AsyncClient):
    """Verify /api/v1/weather/severe returns risk assessments."""
    response = await async_client.get("/api/v1/weather/severe?city=Kanpur")
    assert response.status_code == 200
    data = response.json()
    assert "has_severe_risks" in data
    assert "risks" in data


@pytest.mark.asyncio
async def test_advisory_endpoint(async_client: httpx.AsyncClient):
    """Verify /api/v1/weather/advisory returns safety recommendations."""
    response = await async_client.get("/api/v1/weather/advisory?city=Kanpur")
    assert response.status_code == 200
    data = response.json()
    assert "advisories" in data
    assert len(data["advisories"]) > 0


@pytest.mark.asyncio
async def test_weather_source_transparency_endpoint(async_client: httpx.AsyncClient):
    """Verify /api/v1/weather/source returns provenance metadata."""
    response = await async_client.get("/api/v1/weather/source?city=Kanpur")
    assert response.status_code == 200
    data = response.json()
    assert data["location"]["name"] == "Kanpur"
    assert "source" in data
    assert data["data_available"] is True


@pytest.mark.asyncio
async def test_weather_providers_endpoint(async_client: httpx.AsyncClient):
    """Verify /api/v1/weather/providers lists IMD, OWM, NWP, Radar, Satellite."""
    response = await async_client.get("/api/v1/weather/providers")
    assert response.status_code == 200
    data = response.json()
    assert "providers" in data
    p_ids = [p["provider_id"] for p in data["providers"]]
    assert "imd" in p_ids
    assert "openweather" in p_ids
    assert "nwp" in p_ids
    assert "radar" in p_ids
    assert "satellite" in p_ids
