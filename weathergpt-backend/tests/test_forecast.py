import pytest
import httpx


@pytest.mark.asyncio
async def test_get_forecast(async_client: httpx.AsyncClient):
    response = await async_client.get("/api/v1/forecast?city=Kanpur")
    assert response.status_code == 200
    data = response.json()

    assert data["location"] == "Kanpur"
    assert "hourly" in data
    assert "daily" in data
    assert isinstance(data["hourly"], list)
    assert isinstance(data["daily"], list)

    if data["hourly"]:
        first_hour = data["hourly"][0]
        assert "time" in first_hour
        assert "temperature" in first_hour
        assert "condition" in first_hour
        assert "pop" in first_hour
        assert "wind_speed" in first_hour
        assert "humidity" in first_hour

    if data["daily"]:
        first_day = data["daily"][0]
        assert "day" in first_day
        assert "date" in first_day
        assert "temp_min" in first_day
        assert "temp_max" in first_day
        assert "condition" in first_day
