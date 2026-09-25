from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.api.deps import get_forecast_service
from app.schemas.forecast import ForecastResponse
from app.services.forecast_service import ForecastService
from app.utils.validators import validate_city_name, validate_coordinates

router = APIRouter(prefix="/forecast", tags=["Forecast"])


@router.get(
    "",
    summary="Get Weather Forecast",
    response_model=ForecastResponse,
    description="Retrieve 24-hour timeline and 7-day weather forecast.",
)
async def get_forecast(
    city: Optional[str] = Query(
        default=None,
        description="Target city name (e.g. 'Kanpur')",
    ),
    lat: Optional[float] = Query(default=None, description="Latitude coordinate"),
    lon: Optional[float] = Query(default=None, description="Longitude coordinate"),
    forecast_service: ForecastService = Depends(get_forecast_service),
) -> ForecastResponse:
    if lat is not None and lon is not None:
        validate_coordinates(lat, lon)
        resolved_city = city or f"Coord({lat:.2f},{lon:.2f})"
        return await forecast_service.get_forecast(city=resolved_city, lat=lat, lon=lon)

    if not city or not city.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide a city name or latitude and longitude.",
        )
    validated_city = validate_city_name(city)
    return await forecast_service.get_forecast(city=validated_city)
