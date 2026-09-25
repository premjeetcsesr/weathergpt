from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.api.deps import (
    get_alert_repo,
    get_alert_service,
    get_alert_sub_repo,
    get_current_user_optional,
)
from app.db.mongo_repositories import MongoAlertRepository, MongoAlertSubscriptionRepository
from app.schemas.alerts import (
    AlertHistoryResponse,
    AlertSubscriptionCreate,
    AlertSubscriptionListResponse,
    AlertSubscriptionResponse,
    AlertsResponse,
    WeatherAlertItem,
)
from app.services.alert_service import AlertService
from app.utils.validators import validate_city_name, validate_coordinates

router = APIRouter(prefix="/alerts", tags=["Alerts"])


# ---------------------------------------------------------------------------
# Alert Queries (Active & Specific & History)
# ---------------------------------------------------------------------------

@router.get(
    "",
    summary="Get Active Weather Alerts",
    response_model=AlertsResponse,
    description="Query active severe weather advisories and emergency warnings.",
)
async def get_alerts(
    city: Optional[str] = Query(default=None, description="Location to check for alerts"),
    latitude: Optional[float] = Query(default=None, description="Latitude coordinate"),
    longitude: Optional[float] = Query(default=None, description="Longitude coordinate"),
    lat: Optional[float] = Query(default=None, description="Alias for latitude"),
    lon: Optional[float] = Query(default=None, description="Alias for longitude"),
    severity: Optional[str] = Query(default=None, description="Filter by severity: minor, moderate, severe, extreme"),
    active: bool = Query(default=True, description="Filter only active alerts"),
    alert_service: AlertService = Depends(get_alert_service),
) -> AlertsResponse:
    effective_lat = latitude if latitude is not None else lat
    effective_lon = longitude if longitude is not None else lon

    if effective_lat is not None and effective_lon is not None:
        validate_coordinates(effective_lat, effective_lon)
        resolved_city = city or f"Coord({effective_lat:.2f},{effective_lon:.2f})"
        return await alert_service.get_alerts(
            city=resolved_city,
            lat=effective_lat,
            lon=effective_lon,
            severity=severity,
            active_only=active,
        )

    if not city or not city.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide a city name or latitude and longitude.",
        )
    validated_city = validate_city_name(city)
    return await alert_service.get_alerts(
        city=validated_city,
        severity=severity,
        active_only=active,
    )


@router.get(
    "/history",
    summary="Get Historical Weather Alerts",
    response_model=AlertHistoryResponse,
    description="Retrieve historical archived meteorological advisories and warnings with filtering.",
)
async def get_alerts_history(
    city: Optional[str] = Query(default=None, description="Filter by city name"),
    date: Optional[str] = Query(default=None, description="Filter from date (ISO 8601 string)"),
    severity: Optional[str] = Query(default=None, description="Filter by severity level"),
    limit: int = Query(default=50, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
    alert_service: AlertService = Depends(get_alert_service),
) -> AlertHistoryResponse:
    items = await alert_service.get_alert_history(
        city=city,
        date_from=date,
        severity=severity,
        limit=limit,
        skip=skip,
    )
    return AlertHistoryResponse(alerts=items, total=len(items))


# ---------------------------------------------------------------------------
# Location Subscriptions REST Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/subscriptions",
    summary="Create Location Alert Subscription",
    response_model=AlertSubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    description="Subscribe a user or device to real-time alerts for a specific location.",
)
async def create_subscription(
    payload: AlertSubscriptionCreate,
    sub_repo: MongoAlertSubscriptionRepository = Depends(get_alert_sub_repo),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> AlertSubscriptionResponse:
    city = validate_city_name(payload.location.city)
    if payload.location.latitude is not None and payload.location.longitude is not None:
        validate_coordinates(payload.location.latitude, payload.location.longitude)

    user_id = str(current_user["id"]) if current_user and "id" in current_user else None
    doc = await sub_repo.create_subscription(
        city=city,
        user_id=user_id,
        latitude=payload.location.latitude,
        longitude=payload.location.longitude,
        severity_threshold=payload.severity_threshold,
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create alert subscription.",
        )
    return AlertSubscriptionResponse.model_validate(doc)


@router.get(
    "/subscriptions",
    summary="List Alert Subscriptions",
    response_model=AlertSubscriptionListResponse,
    description="Retrieve all location alert subscriptions registered for current user.",
)
async def get_subscriptions(
    sub_repo: MongoAlertSubscriptionRepository = Depends(get_alert_sub_repo),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> AlertSubscriptionListResponse:
    user_id = str(current_user["id"]) if current_user and "id" in current_user else None
    docs = await sub_repo.get_subscriptions(user_id=user_id)
    items = [AlertSubscriptionResponse.model_validate(d) for d in docs]
    return AlertSubscriptionListResponse(subscriptions=items, total=len(items))


@router.delete(
    "/subscriptions/{subscription_id}",
    summary="Delete Alert Subscription",
    status_code=status.HTTP_200_OK,
    description="Remove an alert subscription by ID.",
)
async def delete_subscription(
    subscription_id: str,
    sub_repo: MongoAlertSubscriptionRepository = Depends(get_alert_sub_repo),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    user_id = str(current_user["id"]) if current_user and "id" in current_user else None
    deleted = await sub_repo.delete_subscription(
        subscription_id=subscription_id,
        user_id=user_id,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription '{subscription_id}' not found.",
        )
    return {"success": True, "message": "Subscription deleted successfully."}


# ---------------------------------------------------------------------------
# Individual Alert Detail
# ---------------------------------------------------------------------------

@router.get(
    "/{alert_id}",
    summary="Get Alert Detail by ID",
    response_model=WeatherAlertItem,
    description="Retrieve single alert details by provider or internal ID.",
)
async def get_alert_by_id(
    alert_id: str,
    alert_service: AlertService = Depends(get_alert_service),
) -> WeatherAlertItem:
    alert = await alert_service.get_alert_by_id(alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Weather alert '{alert_id}' not found.",
        )
    return alert
