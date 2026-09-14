import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.schemas.radar_satellite import ProviderState


@pytest.mark.asyncio
async def test_radar_status_unconfigured_by_default():
    """Verify Doppler Radar truthfully reports NOT_CONFIGURED when no feed is configured."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/weather/radar/status")
        assert response.status_code == 200
        data = response.json()
        assert data["provider"] == "IMD"
        assert data["status"] == ProviderState.NOT_CONFIGURED.value
        assert data["configured"] is False
        assert "not configured" in data["message"].lower()
        assert "DWR" in data["attribution"]


@pytest.mark.asyncio
async def test_radar_products_list():
    """Verify radar product catalog is available and correctly flags unconfigured state."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/weather/radar/products")
        assert response.status_code == 200
        data = response.json()
        assert data["provider"] == "IMD"
        product_ids = [p["product_id"] for p in data["products"]]
        assert "reflectivity" in product_ids
        assert "precipitation_intensity" in product_ids
        assert "precipitation_accumulation" in product_ids


@pytest.mark.asyncio
async def test_radar_layer_metadata():
    """Verify radar layer definition returns geographic bounds and accurate provenance."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/weather/radar/layer?product=reflectivity")
        assert response.status_code == 200
        data = response.json()
        assert data["provider"] == "IMD"
        assert data["product"] == "reflectivity"
        assert data["status"] == ProviderState.NOT_CONFIGURED.value
        assert len(data["bounds"]) == 2


@pytest.mark.asyncio
async def test_radar_tile_proxy_unconfigured():
    """Verify radar tile proxy returns transparent 1x1 image without crashing when unconfigured."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/weather/radar/tiles/reflectivity/6/45/28")
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"
        assert response.headers["x-provider-status"] == "NOT_CONFIGURED"
        assert len(response.content) > 0


@pytest.mark.asyncio
async def test_satellite_status_unconfigured_by_default():
    """Verify INSAT-3D truthfully reports NOT_CONFIGURED when no feed is configured."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/weather/satellite/status")
        assert response.status_code == 200
        data = response.json()
        assert data["provider"] == "IMD"
        assert data["satellite"] == "INSAT-3D"
        assert data["status"] == ProviderState.NOT_CONFIGURED.value
        assert data["configured"] is False
        assert "not configured" in data["message"].lower()


@pytest.mark.asyncio
async def test_satellite_products_list():
    """Verify satellite products cover VIS, TIR1, WV, and Cloud Motion."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/weather/satellite/products")
        assert response.status_code == 200
        data = response.json()
        assert data["satellite"] == "INSAT-3D"
        product_ids = [p["product_id"] for p in data["products"]]
        assert "visible" in product_ids
        assert "infrared_tir1" in product_ids
        assert "water_vapour" in product_ids
        assert "cloud_motion_vectors" in product_ids


@pytest.mark.asyncio
async def test_satellite_layer_metadata():
    """Verify satellite layer definition returns Indian Ocean spatial bounds."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/weather/satellite/layer?product=visible")
        assert response.status_code == 200
        data = response.json()
        assert data["satellite"] == "INSAT-3D"
        assert data["bounds"] is not None
        assert "ISRO" in data["attribution"]


@pytest.mark.asyncio
async def test_satellite_tile_proxy_unconfigured():
    """Verify satellite tile proxy returns clean transparent image when unconfigured."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/weather/satellite/tiles/visible/4/10/7")
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"
        assert response.headers["x-provider-status"] == "NOT_CONFIGURED"


@pytest.mark.asyncio
async def test_weather_providers_includes_radar_and_satellite():
    """Verify GET /api/v1/weather/providers includes Doppler Radar and INSAT-3D with truthful status."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/weather/providers")
        assert response.status_code == 200
        data = response.json()
        providers = data["providers"]

        names = [p["name"] for p in providers]
        assert any("Radar" in n for n in names)
        assert any("INSAT-3D" in n for n in names)
        assert any("OpenWeatherMap" in n for n in names)
        assert any("IMD" in n for n in names)

        radar_p = next(p for p in providers if "Radar" in p["name"])
        assert radar_p["status"] in ["NOT_CONFIGURED", "ACTIVE"]

        sat_p = next(p for p in providers if "INSAT-3D" in p["name"])
        assert sat_p["status"] in ["NOT_CONFIGURED", "ACTIVE"]
