from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_weather_service
from app.db.database import get_db
from app.db.repositories import HistoryRepository
from app.schemas.weather import WeatherResponse
from app.services.weather_service import WeatherService
from app.utils.validators import validate_city_name, validate_coordinates

router = APIRouter(prefix="/weather", tags=["Weather"])


@router.get(
    "",
    summary="Get Current Weather",
    response_model=WeatherResponse,
    description="Fetch real-time normalized weather telemetry for a city name or geospatial coordinates.",
)
async def get_current_weather(
    city: Optional[str] = Query(
        default=None,
        description="City name (e.g., 'Kanpur', 'New Delhi', 'Mumbai')",
    ),
    lat: Optional[float] = Query(default=None, description="Latitude coordinate"),
    lon: Optional[float] = Query(default=None, description="Longitude coordinate"),
    weather_service: WeatherService = Depends(get_weather_service),
    db: Optional[AsyncSession] = Depends(get_db),
) -> WeatherResponse:
    if lat is not None and lon is not None:
        validate_coordinates(lat, lon)
        resolved_city = city or f"Coord({lat:.2f},{lon:.2f})"
        data = await weather_service.get_current_weather(city=resolved_city, lat=lat, lon=lon)
    else:
        validated_city = validate_city_name(city or "Kanpur")
        data = await weather_service.get_current_weather(city=validated_city)

    if db is not None:
        try:
            repo = HistoryRepository(db)
            await repo.log_search(
                query=city or f"{lat},{lon}",
                location_name=data.location.city,
                latitude=data.location.latitude,
                longitude=data.location.longitude,
            )
        except Exception:
            pass

    return data
