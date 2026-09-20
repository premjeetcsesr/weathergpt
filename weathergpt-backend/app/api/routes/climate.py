from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from app.api.deps import get_climate_service, get_llm_service
from app.schemas.climate import (
    ClimateAnomalyResponse,
    ClimateComparisonResponse,
    ClimateInsightRequest,
    ClimateInsightResponse,
    ClimateSummaryResponse,
    HumiditySeriesResponse,
    RainfallSeriesResponse,
    TemperatureSeriesResponse,
)
from app.services.climate_service import ClimateService
from app.services.llm_service import LLMService

router = APIRouter(prefix="/climate", tags=["Climate Analytics"])


@router.get(
    "/summary",
    summary="Get Climate Summary",
    response_model=ClimateSummaryResponse,
    status_code=status.HTTP_200_OK,
    description="Retrieve aggregated historical climate metrics (avg/min/max temperature, total rainfall, rainy days, humidity, extreme events).",
)
async def get_climate_summary(
    city: str = Query(..., description="Target city name"),
    range_key: Optional[str] = Query(default="last_30_days", description="Time window (last_7_days, last_30_days, last_3_months, last_6_months, last_1_year, custom)"),
    start_date: Optional[str] = Query(default=None, description="Start date (YYYY-MM-DD) for custom range"),
    end_date: Optional[str] = Query(default=None, description="End date (YYYY-MM-DD) for custom range"),
    lat: Optional[float] = Query(default=None, description="Latitude"),
    lon: Optional[float] = Query(default=None, description="Longitude"),
    climate_service: ClimateService = Depends(get_climate_service),
) -> ClimateSummaryResponse:
    return await climate_service.get_climate_summary(
        city=city,
        start_date=start_date,
        end_date=end_date,
        range_key=range_key,
        lat=lat,
        lon=lon,
    )


@router.get(
    "/temperature",
    summary="Get Temperature Time-Series & Trend",
    response_model=TemperatureSeriesResponse,
    status_code=status.HTTP_200_OK,
    description="Fetch daily temperature readings (avg/min/max) and linear regression trend slope for the selected period.",
)
async def get_temperature_trend(
    city: str = Query(..., description="Target city name"),
    range_key: Optional[str] = Query(default="last_30_days", description="Time window"),
    start_date: Optional[str] = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="End date (YYYY-MM-DD)"),
    climate_service: ClimateService = Depends(get_climate_service),
) -> TemperatureSeriesResponse:
    return await climate_service.get_temperature_trend(
        city=city,
        start_date=start_date,
        end_date=end_date,
        range_key=range_key,
    )


@router.get(
    "/rainfall",
    summary="Get Rainfall Time-Series & Trend",
    response_model=RainfallSeriesResponse,
    status_code=status.HTTP_200_OK,
    description="Fetch daily and cumulative rainfall telemetry with rainy day counts and trend indicators.",
)
async def get_rainfall_trend(
    city: str = Query(..., description="Target city name"),
    range_key: Optional[str] = Query(default="last_30_days", description="Time window"),
    start_date: Optional[str] = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="End date (YYYY-MM-DD)"),
    climate_service: ClimateService = Depends(get_climate_service),
) -> RainfallSeriesResponse:
    return await climate_service.get_rainfall_trend(
        city=city,
        start_date=start_date,
        end_date=end_date,
        range_key=range_key,
    )


@router.get(
    "/humidity",
    summary="Get Humidity Time-Series",
    response_model=HumiditySeriesResponse,
    status_code=status.HTTP_200_OK,
    description="Fetch relative humidity readings and variation trends for the selected period.",
)
async def get_humidity_trend(
    city: str = Query(..., description="Target city name"),
    range_key: Optional[str] = Query(default="last_30_days", description="Time window"),
    start_date: Optional[str] = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="End date (YYYY-MM-DD)"),
    climate_service: ClimateService = Depends(get_climate_service),
) -> HumiditySeriesResponse:
    return await climate_service.get_humidity_trend(
        city=city,
        start_date=start_date,
        end_date=end_date,
        range_key=range_key,
    )


@router.get(
    "/anomalies",
    summary="Get Statistical Climate Anomalies",
    response_model=ClimateAnomalyResponse,
    status_code=status.HTTP_200_OK,
    description="Detect meteorological anomalies based on historical baseline Z-scores (|z|<1 Normal, 1<=|z|<2 Moderate, |z|>=2 Significant).",
)
async def get_climate_anomalies(
    city: str = Query(..., description="Target city name"),
    range_key: Optional[str] = Query(default="last_30_days", description="Time window"),
    start_date: Optional[str] = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="End date (YYYY-MM-DD)"),
    climate_service: ClimateService = Depends(get_climate_service),
) -> ClimateAnomalyResponse:
    return await climate_service.get_anomalies(
        city=city,
        start_date=start_date,
        end_date=end_date,
        range_key=range_key,
    )


@router.get(
    "/comparison",
    summary="Compare Equivalent Climate Periods",
    response_model=ClimateComparisonResponse,
    status_code=status.HTTP_200_OK,
    description="Compare current time window with previous equivalent historical period (e.g. current 30 days vs previous 30 days).",
)
async def get_climate_comparison(
    city: str = Query(..., description="Target city name"),
    range_key: Optional[str] = Query(default="last_30_days", description="Time window"),
    start_date: Optional[str] = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="End date (YYYY-MM-DD)"),
    climate_service: ClimateService = Depends(get_climate_service),
) -> ClimateComparisonResponse:
    return await climate_service.get_comparison(
        city=city,
        range_key=range_key,
        start_date=start_date,
        end_date=end_date,
    )


@router.post(
    "/insights",
    summary="Generate Grounded Climate Insights",
    response_model=ClimateInsightResponse,
    status_code=status.HTTP_200_OK,
    description="Convert verified calculated climate metrics into natural-language explanations without inventing data.",
)
async def generate_climate_insights(
    request: ClimateInsightRequest,
    llm_service: LLMService = Depends(get_llm_service),
) -> ClimateInsightResponse:
    text, is_ai = await llm_service.generate_climate_insights(
        location=request.location,
        period=request.period,
        metrics=request.metrics,
        language=request.language or "en",
    )
    return ClimateInsightResponse(
        success=True,
        location=request.location,
        period=request.period,
        language=request.language or "en",
        insight=text,
        ai_generated=is_ai,
        source="verified_climate_metrics",
    )
