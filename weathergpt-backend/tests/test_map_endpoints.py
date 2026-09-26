import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch

from app.main import app


@pytest.mark.asyncio
async def test_reverse_geocode_endpoint():
    mock_location = {
        "name": "Civil Lines",
        "display_name": "Civil Lines, Kanpur, Uttar Pradesh, India",
        "city": "Kanpur",
        "district": "Kanpur Nagar",
        "state": "Uttar Pradesh",
        "country": "India",
        "country_code": "in",
        "latitude": 26.4499,
        "longitude": 80.3319,
    }

    with patch("app.services.map_service.map_service.reverse_geocode", new_callable=AsyncMock) as mock_geo:
        mock_geo.return_value = mock_location

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/map/reverse-geocode?lat=26.4499&lon=80.3319")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["location"]["city"] == "Kanpur"
            assert data["location"]["name"] == "Civil Lines"


@pytest.mark.asyncio
async def test_map_location_endpoint():
    mock_location = {
        "name": "Connaught Place",
        "display_name": "Connaught Place, New Delhi, Delhi, India",
        "city": "New Delhi",
        "district": "New Delhi",
        "state": "Delhi",
        "country": "India",
        "country_code": "in",
        "latitude": 28.6139,
        "longitude": 77.2090,
    }

    with patch("app.services.map_service.map_service.reverse_geocode", new_callable=AsyncMock) as mock_geo:
        mock_geo.return_value = mock_location

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/map/location?lat=28.6139&lon=77.2090")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["location"]["city"] == "New Delhi"


@pytest.mark.asyncio
async def test_nearby_community_reports_empty_db():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/map/community-reports/nearby?lat=26.4499&lon=80.3319&radius_km=15")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["center"]["latitude"] == 26.4499
        assert data["center"]["longitude"] == 80.3319
        assert isinstance(data["reports"], list)
