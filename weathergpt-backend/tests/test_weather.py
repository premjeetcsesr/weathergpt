import pytest
import httpx


@pytest.mark.asyncio
async def test_get_weather_by_city(async_client: httpx.AsyncClient):
    response = await async_client.get("/api/v1/weather?city=Kanpur")
    assert response.status_code == 200
    data = response.json()

    assert data["location"]["city"] == "Kanpur"
    assert data["location"]["country"] == "IN"
    assert "latitude" in data["location"]
    assert "longitude" in data["location"]

    current = data["current"]
    assert current["temperature"] == 31.0
    assert current["feels_like"] == 33.0
    assert current["condition"] == "Partly Cloudy"
    assert current["humidity"] == 78
    assert "wind_speed" in current
    assert "pressure" in current
    assert "visibility" in current

    assert data["units"] == "metric"
    assert data["source"] == "openweathermap"


@pytest.mark.asyncio
async def test_get_weather_by_coordinates(async_client: httpx.AsyncClient):
    response = await async_client.get("/api/v1/weather?lat=26.4499&lon=80.3319")
    assert response.status_code == 200
    data = response.json()
    assert "current" in data
    assert data["location"]["latitude"] == 26.4499
    assert data["location"]["longitude"] == 80.3319


@pytest.mark.asyncio
async def test_get_weather_city_not_found(async_client: httpx.AsyncClient):
    response = await async_client.get("/api/v1/weather?city=nonexistentcity12345")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "LOCATION_NOT_FOUND"


@pytest.mark.asyncio
async def test_get_weather_invalid_coordinates(async_client: httpx.AsyncClient):
    response = await async_client.get("/api/v1/weather?lat=999.0&lon=80.3319")
    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "INVALID_COORDINATES"
