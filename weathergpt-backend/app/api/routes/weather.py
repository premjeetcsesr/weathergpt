from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import (
    get_current_user_optional,
    get_weather_history_repo,
    get_weather_service,
)
from app.db.database import get_db
from app.db.mongo_repositories import MongoWeatherHistoryRepository
from app.db.repositories import HistoryRepository
from app.schemas.mongo_models import (
    PopularCityItem,
    PopularLocationResponse,
    WeatherHistoryListResponse,
    WeatherHistoryRecord,
)
from app.schemas.weather import WeatherResponse
from app.services.weather_service import WeatherService
from app.utils.validators import validate_city_name, validate_coordinates

router = APIRouter(prefix="/weather", tags=["Weather & Weather History"])


@router.get(
    "",
    summary="Get Current Weather",
    response_model=WeatherResponse,
    description="Fetch real-time normalized weather telemetry for a city name or geospatial coordinates and log to MongoDB.",
)
async def get_current_weather(
    city: Optional[str] = Query(
        default=None,
        description="City name (e.g., 'Kanpur', 'New Delhi', 'Mumbai')",
    ),
    lat: Optional[float] = Query(default=None, description="Latitude coordinate"),
    lon: Optional[float] = Query(default=None, description="Longitude coordinate"),
    session_id: Optional[str] = Query(default=None, description="Optional visitor session ID"),
    weather_service: WeatherService = Depends(get_weather_service),
    weather_history_repo: MongoWeatherHistoryRepository = Depends(get_weather_history_repo),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    db: Optional[AsyncSession] = Depends(get_db),
) -> WeatherResponse:
    if lat is not None and lon is not None:
        validate_coordinates(lat, lon)
        resolved_city = city or f"Coord({lat:.2f},{lon:.2f})"
        data = await weather_service.get_current_weather(city=resolved_city, lat=lat, lon=lon)
    else:
        validated_city = validate_city_name(city or "Kanpur")
        data = await weather_service.get_current_weather(city=validated_city)

    # 1. Log to MongoDB weather_history
    user_id = str(current_user["id"]) if current_user and "id" in current_user else None
    try:
        await weather_history_repo.log_weather_query(
            query=city or f"{lat},{lon}",
            city=data.location.city,
            latitude=data.location.latitude,
            longitude=data.location.longitude,
            temperature=data.current.temperature,
            feels_like=data.current.feels_like,
            condition=data.current.condition,
            humidity=data.current.humidity,
            wind_speed=data.current.wind_speed,
            source=data.source,
            user_id=user_id,
            session_id=session_id,
        )
    except Exception:
        pass

    # 2. Log to SQL DB if configured
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


@router.get(
    "/history",
    summary="Get Weather Search History",
    response_model=WeatherHistoryListResponse,
    description="Retrieve historical weather queries and telemetry snapshots from MongoDB.",
)
async def get_weather_history(
    session_id: Optional[str] = Query(default=None, description="Visitor session ID"),
    limit: int = Query(default=20, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
    weather_history_repo: MongoWeatherHistoryRepository = Depends(get_weather_history_repo),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> WeatherHistoryListResponse:
    user_id = str(current_user["id"]) if current_user and "id" in current_user else None
    docs = await weather_history_repo.get_history(
        user_id=user_id,
        session_id=session_id,
        limit=limit,
        skip=skip,
    )
    items = [WeatherHistoryRecord.model_validate(d) for d in docs]
    return WeatherHistoryListResponse(items=items, total=len(items))


@router.get(
    "/history/popular",
    summary="Get Popular Weather Cities",
    response_model=PopularLocationResponse,
    description="Get aggregated most frequently searched cities and telemetry access counts from MongoDB.",
)
async def get_popular_searches(
    limit: int = Query(default=6, ge=1, le=20),
    weather_history_repo: MongoWeatherHistoryRepository = Depends(get_weather_history_repo),
) -> PopularLocationResponse:
    docs = await weather_history_repo.get_popular_cities(limit=limit)
    items = [PopularCityItem.model_validate(d) for d in docs]
    return PopularLocationResponse(items=items)


@router.delete(
    "/history",
    summary="Clear Weather Search History",
    status_code=status.HTTP_200_OK,
    description="Clear weather search query history for the user or session.",
)
async def clear_weather_history(
    session_id: Optional[str] = Query(default=None),
    weather_history_repo: MongoWeatherHistoryRepository = Depends(get_weather_history_repo),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    user_id = str(current_user["id"]) if current_user and "id" in current_user else None
    deleted = await weather_history_repo.clear_history(user_id=user_id, session_id=session_id)
    return {"success": True, "message": f"Cleared {deleted} weather history records."}


@router.get(
    "/tiles/{layer}/{z}/{x}/{y}",
    summary="Proxy Weather Map Tiles",
    description="Securely proxy weather map tile requests server-side without exposing API keys to the client.",
)
async def proxy_weather_tile(
    layer: str,
    z: int,
    x: int,
    y: int,
):
    import httpx
    from fastapi import Response
    from app.core.config import get_settings

    settings = get_settings()
    api_key = settings.WEATHER_API_KEY
    if not api_key:
        # Return 1x1 transparent PNG if provider key is not configured
        transparent_png = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00"
            b"\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        return Response(content=transparent_png, media_type="image/png")

    target_url = f"https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid={api_key}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(target_url)
            if resp.status_code == 200:
                return Response(
                    content=resp.content,
                    media_type="image/png",
                    headers={"Cache-Control": "public, max-age=3600"},
                )
    except Exception:
        pass

    # Fallback transparent PNG
    transparent_png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00"
        b"\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    return Response(content=transparent_png, media_type="image/png")


