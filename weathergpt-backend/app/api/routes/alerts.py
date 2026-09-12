from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.api.deps import get_alert_service
from app.schemas.alerts import AlertsResponse
from app.services.alert_service import AlertService
from app.utils.validators import validate_city_name, validate_coordinates

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get(
    "",
    summary="Get Active Weather Alerts",
    response_model=AlertsResponse,
    description="Query active severe weather advisories and disaster warnings.",
)
async def get_alerts(
    city: Optional[str] = Query(default=None, description="Location to check for alerts"),
    lat: Optional[float] = Query(default=None, description="Latitude coordinate"),
    lon: Optional[float] = Query(default=None, description="Longitude coordinate"),
    alert_service: AlertService = Depends(get_alert_service),
) -> AlertsResponse:
    if lat is not None and lon is not None:
        validate_coordinates(lat, lon)
        resolved_city = city or f"Coord({lat:.2f},{lon:.2f})"
        return await alert_service.get_alerts(city=resolved_city, lat=lat, lon=lon)

    validated_city = validate_city_name(city or "Kanpur")
    return await alert_service.get_alerts(city=validated_city)
