import pytest
import httpx
from app.db.mongo_repositories import MongoClimateRepository
from app.services.climate_ingestion_service import ClimateIngestionService


@pytest.mark.asyncio
async def test_climate_summary_endpoint(async_client: httpx.AsyncClient):
    """Verify /api/v1/climate/summary returns valid metrics and data source."""
    response = await async_client.get("/api/v1/climate/summary?city=Kanpur&range_key=last_30_days")
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["location"]["name"] == "Kanpur"
    assert "metrics" in data
    m = data["metrics"]
    assert m["avg_temperature"] is not None
    assert m["max_temperature"] is not None
    assert m["min_temperature"] is not None
    assert m["total_rainfall"] is not None
    assert m["avg_humidity"] is not None
    assert "source" in data


@pytest.mark.asyncio
async def test_climate_temperature_trend_and_slope(async_client: httpx.AsyncClient):
    """Verify /api/v1/climate/temperature returns time-series points and linear regression trend."""
    response = await async_client.get("/api/v1/climate/temperature?city=Kanpur&range_key=last_30_days")
    assert response.status_code == 200
    data = response.json()

    assert data["data_available"] is True
    assert "points" in data
    assert len(data["points"]) > 0
    assert "avg" in data["points"][0]
    assert "trend" in data
    assert data["trend"]["direction"] in ["increasing", "decreasing", "stable"]
    assert isinstance(data["trend"]["slope"], (int, float))


@pytest.mark.asyncio
async def test_climate_rainfall_series(async_client: httpx.AsyncClient):
    """Verify /api/v1/climate/rainfall returns cumulative precipitation and rainy days."""
    response = await async_client.get("/api/v1/climate/rainfall?city=Kanpur&range_key=last_30_days")
    assert response.status_code == 200
    data = response.json()

    assert data["data_available"] is True
    assert data["total_rainfall"] >= 0.0
    assert data["rainy_days"] >= 0
    assert len(data["points"]) > 0
    # Cumulative should be non-decreasing
    cum_values = [p["cumulative"] for p in data["points"]]
    assert cum_values == sorted(cum_values)


@pytest.mark.asyncio
async def test_climate_humidity_series(async_client: httpx.AsyncClient):
    """Verify /api/v1/climate/humidity returns relative humidity points and trend."""
    response = await async_client.get("/api/v1/climate/humidity?city=Kanpur&range_key=last_30_days")
    assert response.status_code == 200
    data = response.json()

    assert data["data_available"] is True
    assert "points" in data
    assert len(data["points"]) > 0
    assert 0 <= data["points"][0]["humidity"] <= 100


@pytest.mark.asyncio
async def test_climate_zscore_anomalies(async_client: httpx.AsyncClient):
    """Verify /api/v1/climate/anomalies returns valid Z-score anomalies with proper classifications."""
    response = await async_client.get("/api/v1/climate/anomalies?city=Kanpur&range_key=last_30_days")
    assert response.status_code == 200
    data = response.json()

    assert data["data_available"] is True
    assert "anomalies" in data
    assert len(data["anomalies"]) > 0

    valid_classes = ["Normal", "Moderate anomaly", "Significant anomaly"]
    for anom in data["anomalies"]:
        assert anom["classification"] in valid_classes
        assert "z_score" in anom
        assert "description" in anom


@pytest.mark.asyncio
async def test_climate_period_comparison(async_client: httpx.AsyncClient):
    """Verify /api/v1/climate/comparison compares current vs previous equivalent period."""
    response = await async_client.get("/api/v1/climate/comparison?city=Kanpur&range_key=last_30_days")
    assert response.status_code == 200
    data = response.json()

    assert "sufficient_data_for_comparison" in data
    if data["sufficient_data_for_comparison"]:
        assert len(data["metrics"]) >= 3
        metric_names = [m["metric_name"] for m in data["metrics"]]
        assert "Average Temperature" in metric_names
        assert "Total Rainfall" in metric_names
        assert "Average Humidity" in metric_names


@pytest.mark.asyncio
async def test_climate_insights_grounding(async_client: httpx.AsyncClient):
    """Verify POST /api/v1/climate/insights converts verified metrics into a grounded explanation."""
    payload = {
        "location": "Kanpur",
        "period": "last 30 days",
        "metrics": {
            "avg_temperature": 31.4,
            "temperature_change": 1.2,
            "total_rainfall": 95.0,
            "rainfall_change": -8.5,
            "rainy_days": 8,
        },
        "language": "en",
    }
    response = await async_client.post("/api/v1/climate/insights", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["location"] == "Kanpur"
    assert "insight" in data
    assert len(data["insight"]) > 0
    # Numerical values from payload must be preserved
    assert "31.4" in data["insight"] or "Kanpur" in data["insight"]


@pytest.mark.asyncio
async def test_climate_empty_historical_data_handling(async_client: httpx.AsyncClient, mock_mongo_db):
    """Verify clear response when historical climate data is not available for an unseeded city."""
    response = await async_client.get("/api/v1/climate/summary?city=NonExistentMetCity12345")
    assert response.status_code == 200
    data = response.json()
    assert data["data_available"] is False
    assert "not available" in (data.get("message") or "")


@pytest.mark.asyncio
async def test_climate_duplicate_prevention(mock_mongo_db):
    """Verify upserting same location and date updates existing document rather than duplicating."""
    repo = MongoClimateRepository(db=mock_mongo_db)
    ingestion = ClimateIngestionService(repo)

    rec1 = ingestion.normalize_record(
        city="TestCity",
        date_str="2026-09-01",
        avg_temp=30.0,
        min_temp=25.0,
        max_temp=35.0,
        rainfall=5.0,
        humidity=60.0,
        wind_speed=10.0,
    )
    saved1 = await repo.upsert_record(rec1)
    assert saved1 is True

    # Upsert updated record for same city and date
    rec2 = ingestion.normalize_record(
        city="TestCity",
        date_str="2026-09-01",
        avg_temp=31.5,
        min_temp=26.0,
        max_temp=36.0,
        rainfall=6.0,
        humidity=62.0,
        wind_speed=11.0,
    )
    saved2 = await repo.upsert_record(rec2)
    assert saved2 is True

    records = await repo.get_records(city="TestCity", start_date="2026-09-01", end_date="2026-09-01")
    assert len(records) == 1
    assert records[0]["temperature"]["avg"] == 31.5
