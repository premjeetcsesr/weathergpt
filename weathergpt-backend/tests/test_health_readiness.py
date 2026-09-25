import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoints():
    """Verify liveness and readiness probe responses."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Liveness
        live_res = await client.get("/health")
        assert live_res.status_code == 200
        assert live_res.json()["status"] == "healthy"

        # Readiness
        ready_res = await client.get("/health/ready")
        assert ready_res.status_code in (200, 503)
        data = ready_res.json()
        assert "database" in data
        assert "weather_provider" in data


@pytest.mark.asyncio
async def test_weather_tile_proxy_endpoint():
    """Verify backend weather tile proxy delivers PNG tiles without requiring client API keys."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/weather/tiles/precipitation_new/1/1/1")
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("image/png")
        assert len(res.content) > 0
