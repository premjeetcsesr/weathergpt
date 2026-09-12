import pytest
import httpx


@pytest.mark.asyncio
async def test_search_locations(async_client: httpx.AsyncClient):
    response = await async_client.get("/api/v1/locations/search?q=Kanpur")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

    first = data[0]
    assert first["name"] == "Kanpur"
    assert "country" in first
    assert "latitude" in first
    assert "longitude" in first


@pytest.mark.asyncio
async def test_search_locations_empty_query(async_client: httpx.AsyncClient):
    response = await async_client.get("/api/v1/locations/search?q=")
    assert response.status_code == 200
    data = response.json()
    assert data == []
