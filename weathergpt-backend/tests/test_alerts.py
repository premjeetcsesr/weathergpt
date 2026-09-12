import pytest
import httpx


@pytest.mark.asyncio
async def test_get_alerts(async_client: httpx.AsyncClient):
    response = await async_client.get("/api/v1/alerts?city=Kanpur")
    assert response.status_code == 200
    data = response.json()

    assert data["location"] == "Kanpur"
    assert "alerts" in data
    assert isinstance(data["alerts"], list)
    assert data["total_alerts"] == len(data["alerts"])
    assert "provider_note" in data
