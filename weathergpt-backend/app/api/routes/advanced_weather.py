"""
Advanced Weather Intelligence API Endpoints (SIH 2026 Step 7).
Provides endpoints for unified meteorological intelligence, short-term nowcast,
official government warnings, severe risk evaluations, actionable safety advisories,
provenance transparency, and multi-provider status tracking.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status

from app.api.deps import (
    get_advisory_service,
    get_forecast_service,
    get_location_intelligence_service,
    get_nowcast_service,
    get_provider_health_service,
    get_severe_weather_service,
    get_warning_service,
    get_weather_service,
    require_admin,
)

from app.schemas.intelligence import (
    AdvisoryResponse,
    AdvancedWeatherResponse,
    NowcastResponse,
    ProviderStatusResponse,
    SevereWeatherResponse,
    SourceTransparencyResponse,
    WarningsResponse,
)
from app.services.advisory_service import AdvisoryService
from app.services.forecast_service import ForecastService
from app.services.location_intelligence_service import LocationIntelligenceService
from app.services.nowcast_service import NowcastService
from app.services.provider_health_service import ProviderHealthService
from app.services.severe_weather_service import SevereWeatherService
from app.services.warning_service import WarningService
from app.services.weather_service import WeatherService
from app.utils.validators import validate_city_name, validate_coordinates

router = APIRouter(prefix="/weather", tags=["Advanced Weather Intelligence & Warnings"])


@router.get(
    "/advanced",
    response_model=AdvancedWeatherResponse,
    summary="Get Advanced Meteorological Intelligence",
    description="Unified endpoint combining verified current weather, forecast summary, official warnings, nowcast, severe weather signals, and safety advisories.",
)
async def get_advanced_weather(
    city: Optional[str] = Query(default=None, description="City or district name (e.g. 'Kanpur', 'New Delhi')"),
    lat: Optional[float] = Query(default=None, description="Latitude"),
    lon: Optional[float] = Query(default=None, description="Longitude"),
    weather_service: WeatherService = Depends(get_weather_service),
    forecast_service: ForecastService = Depends(get_forecast_service),
    warning_service: WarningService = Depends(get_warning_service),
    nowcast_service: NowcastService = Depends(get_nowcast_service),
    severe_service: SevereWeatherService = Depends(get_severe_weather_service),
    advisory_service: AdvisoryService = Depends(get_advisory_service),
    loc_service: LocationIntelligenceService = Depends(get_location_intelligence_service),
) -> AdvancedWeatherResponse:
    loc_info = await loc_service.resolve_location(query=city or "Kanpur", explicit_city=city, lat=lat, lon=lon)
    res_city = loc_info["name"]
    res_lat = loc_info.get("latitude")
    res_lon = loc_info.get("longitude")

    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Core Weather Telemetry
    curr_weather = await weather_service.get_current_weather(city=res_city, lat=res_lat, lon=res_lon)
    source = curr_weather.source

    # 2. Forecast Summary
    forecast_summary = None
    try:
        fc = await forecast_service.get_forecast(city=res_city, lat=res_lat, lon=res_lon)
        if fc.daily:
            d0 = fc.daily[0]
            forecast_summary = f"Today: High {d0.temp_max}°C, Low {d0.temp_min}°C, {d0.condition} with {d0.pop}% rain probability."
    except Exception:
        pass

    # 3. Parallel Modules
    warnings_data = await warning_service.get_official_warnings(city=res_city, lat=res_lat, lon=res_lon)
    nowcast_data = await nowcast_service.get_nowcast(city=res_city, lat=res_lat, lon=res_lon)
    severe_data = await severe_service.get_severe_weather_report(city=res_city, lat=res_lat, lon=res_lon)
    advisory_data = await advisory_service.get_actionable_advisories(city=res_city, lat=res_lat, lon=res_lon)

    return AdvancedWeatherResponse(
        location={"name": res_city, "latitude": res_lat, "longitude": res_lon, "district": loc_info.get("district")},
        source=source,
        issued_at=now_iso,
        updated_at=now_iso,
        valid_until=None,
        confidence="High (Grounded in Verified Telemetry)",
        data_available=True,
        current=curr_weather.current.model_dump(),
        forecast_summary=forecast_summary,
        warnings=warnings_data,
        nowcast=nowcast_data,
        severe_weather=severe_data,
        advisory=advisory_data,
    )


@router.get(
    "/nowcast",
    response_model=NowcastResponse,
    summary="Get Short-Term Nowcast",
    description="Retrieve 0 to 3 hour nowcast telemetry for precipitation probability, lightning, and rapid atmospheric shifts.",
)
async def get_nowcast(
    city: Optional[str] = Query(default=None, description="City name"),
    lat: Optional[float] = Query(default=None, description="Latitude"),
    lon: Optional[float] = Query(default=None, description="Longitude"),
    nowcast_service: NowcastService = Depends(get_nowcast_service),
    loc_service: LocationIntelligenceService = Depends(get_location_intelligence_service),
) -> NowcastResponse:
    loc_info = await loc_service.resolve_location(query=city or "Kanpur", explicit_city=city, lat=lat, lon=lon)
    return await nowcast_service.get_nowcast(
        city=loc_info["name"],
        lat=loc_info.get("latitude"),
        lon=loc_info.get("longitude"),
    )


@router.get(
    "/warnings",
    response_model=WarningsResponse,
    summary="Get Official Meteorological Warnings",
    description="Retrieve official government warnings ranked by severity (EXTREME > SEVERE > MODERATE > MINOR). Returns clear message if no active warning exists.",
)
async def get_official_warnings(
    city: Optional[str] = Query(default=None, description="City or district name"),
    lat: Optional[float] = Query(default=None, description="Latitude"),
    lon: Optional[float] = Query(default=None, description="Longitude"),
    warning_service: WarningService = Depends(get_warning_service),
    loc_service: LocationIntelligenceService = Depends(get_location_intelligence_service),
) -> WarningsResponse:
    loc_info = await loc_service.resolve_location(query=city or "Kanpur", explicit_city=city, lat=lat, lon=lon)
    return await warning_service.get_official_warnings(
        city=loc_info["name"],
        lat=loc_info.get("latitude"),
        lon=loc_info.get("longitude"),
    )


@router.get(
    "/severe",
    response_model=SevereWeatherResponse,
    summary="Get Severe Weather Risk Signals",
    description="Detects severe atmospheric risks (heavy rain, heatwave, gale wind) evaluated against empirical meteorological criteria.",
)
async def get_severe_weather(
    city: Optional[str] = Query(default=None, description="City name"),
    lat: Optional[float] = Query(default=None, description="Latitude"),
    lon: Optional[float] = Query(default=None, description="Longitude"),
    severe_service: SevereWeatherService = Depends(get_severe_weather_service),
    loc_service: LocationIntelligenceService = Depends(get_location_intelligence_service),
) -> SevereWeatherResponse:
    loc_info = await loc_service.resolve_location(query=city or "Kanpur", explicit_city=city, lat=lat, lon=lon)
    return await severe_service.get_severe_weather_report(
        city=loc_info["name"],
        lat=loc_info.get("latitude"),
        lon=loc_info.get("longitude"),
    )


@router.get(
    "/advisory",
    response_model=AdvisoryResponse,
    summary="Get Actionable Safety Advisories",
    description="Generates practical, weather-based safety advisories (travel, hydration, outdoor precautions) clearly separated from official government orders.",
)
async def get_weather_advisory(
    city: Optional[str] = Query(default=None, description="City name"),
    lat: Optional[float] = Query(default=None, description="Latitude"),
    lon: Optional[float] = Query(default=None, description="Longitude"),
    advisory_service: AdvisoryService = Depends(get_advisory_service),
    loc_service: LocationIntelligenceService = Depends(get_location_intelligence_service),
) -> AdvisoryResponse:
    loc_info = await loc_service.resolve_location(query=city or "Kanpur", explicit_city=city, lat=lat, lon=lon)
    return await advisory_service.get_actionable_advisories(
        city=loc_info["name"],
        lat=loc_info.get("latitude"),
        lon=loc_info.get("longitude"),
    )


@router.get(
    "/source",
    response_model=SourceTransparencyResponse,
    summary="Get Meteorological Source Provenance",
    description="Transparency and provenance details about the active weather provider, validity period, and data availability.",
)
async def get_weather_source(
    city: Optional[str] = Query(default="Kanpur", description="City name"),
    weather_service: WeatherService = Depends(get_weather_service),
) -> SourceTransparencyResponse:
    curr = await weather_service.get_current_weather(city=city)
    now_iso = datetime.now(timezone.utc).isoformat()
    return SourceTransparencyResponse(
        location={"name": curr.location.city, "latitude": curr.location.latitude, "longitude": curr.location.longitude},
        source=curr.source,
        data_available=True,
        updated_at=now_iso,
        valid_until=None,
        confidence="High (Grounded in Verified Meteorological Telemetry)",
        notes=f"Data retrieved and normalized via {curr.source}. Numerical values reflect verified sensor feeds.",
    )


@router.get(
    "/providers",
    response_model=ProviderStatusResponse,
    summary="Get All Meteorological Provider Statuses",
    description="Operational status of all active, official (IMD), and future-ready (NWP, Doppler Radar, Satellite) meteorological providers.",
)
async def get_provider_statuses(
    health_service: ProviderHealthService = Depends(get_provider_health_service),
) -> ProviderStatusResponse:
    providers_list = await health_service.check_all_providers()
    return ProviderStatusResponse(
        providers=providers_list,
        active_primary="openweather",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.post(
    "/admin/diagnostics",
    summary="Run Provider Diagnostics (Admin Only)",
    description="Trigger an on-demand deep diagnostics cycle across all providers. Requires ADMIN role.",
)
async def run_admin_diagnostics(
    admin_user: Dict[str, Any] = Depends(require_admin),
    health_service: ProviderHealthService = Depends(get_provider_health_service),
) -> Dict[str, Any]:
    providers_list = await health_service.check_all_providers()
    return {
        "status": "success",
        "authorized_admin": admin_user.get("username", "admin"),
        "role": admin_user.get("role", "admin"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "diagnostics": providers_list,
    }

