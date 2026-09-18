from typing import Any, Dict, Optional
from fastapi import Depends, Header, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.config import Settings, get_settings
from app.core.security import decode_access_token
from app.db.mongodb import get_mongo_database
from app.db.mongo_repositories import (
    MongoAlertRepository,
    MongoAlertSubscriptionRepository,
    MongoChatHistoryRepository,
    MongoClimateRepository,
    MongoLocationRepository,
    MongoNotificationHistoryRepository,
    MongoNotificationRepository,
    MongoUserRepository,
    MongoWeatherHistoryRepository,
    MongoCommunityReportRepository,
)
from app.services.cloudinary_service import CloudinaryService
from app.providers.base import BaseWeatherProvider
from app.providers.weather_provider import OpenWeatherMapProvider
from app.services.alert_service import AlertService
from app.services.chat_service import ChatService
from app.services.climate_ingestion_service import ClimateIngestionService
from app.services.climate_service import ClimateService
from app.services.forecast_service import ForecastService
from app.services.geocoding_service import GeocodingService
from app.services.llm_service import LLMService
from app.services.notification_service import NotificationService
from app.services.weather_service import WeatherService
from app.services.websocket_manager import WebSocketManager, get_websocket_manager


# ---------------------------------------------------------------------------
# MongoDB Repositories Dependencies
# ---------------------------------------------------------------------------

def get_mongo_db() -> Optional[AsyncIOMotorDatabase]:
    """Dependency provider for the MongoDB database instance."""
    return get_mongo_database()


def get_user_repo(db: Optional[AsyncIOMotorDatabase] = Depends(get_mongo_db)) -> MongoUserRepository:
    """Dependency for MongoUserRepository."""
    return MongoUserRepository(db=db)


def get_chat_repo(db: Optional[AsyncIOMotorDatabase] = Depends(get_mongo_db)) -> MongoChatHistoryRepository:
    """Dependency for MongoChatHistoryRepository."""
    return MongoChatHistoryRepository(db=db)


def get_location_repo(db: Optional[AsyncIOMotorDatabase] = Depends(get_mongo_db)) -> MongoLocationRepository:
    """Dependency for MongoLocationRepository."""
    return MongoLocationRepository(db=db)


def get_weather_history_repo(db: Optional[AsyncIOMotorDatabase] = Depends(get_mongo_db)) -> MongoWeatherHistoryRepository:
    """Dependency for MongoWeatherHistoryRepository."""
    return MongoWeatherHistoryRepository(db=db)


def get_notification_repo(db: Optional[AsyncIOMotorDatabase] = Depends(get_mongo_db)) -> MongoNotificationRepository:
    """Dependency for MongoNotificationRepository."""
    return MongoNotificationRepository(db=db)


def get_alert_repo(db: Optional[AsyncIOMotorDatabase] = Depends(get_mongo_db)) -> MongoAlertRepository:
    """Dependency for MongoAlertRepository."""
    return MongoAlertRepository(db=db)


def get_alert_sub_repo(db: Optional[AsyncIOMotorDatabase] = Depends(get_mongo_db)) -> MongoAlertSubscriptionRepository:
    """Dependency for MongoAlertSubscriptionRepository."""
    return MongoAlertSubscriptionRepository(db=db)


def get_notification_history_repo(
    db: Optional[AsyncIOMotorDatabase] = Depends(get_mongo_db),
) -> MongoNotificationHistoryRepository:
    """Dependency for MongoNotificationHistoryRepository."""
    return MongoNotificationHistoryRepository(db=db)


def get_notification_service(
    ws_manager: WebSocketManager = Depends(get_websocket_manager),
    history_repo: MongoNotificationHistoryRepository = Depends(get_notification_history_repo),
) -> NotificationService:
    """Dependency for NotificationService."""
    return NotificationService(ws_manager=ws_manager, history_repo=history_repo)


def get_community_report_repo(
    db: Optional[AsyncIOMotorDatabase] = Depends(get_mongo_db),
) -> MongoCommunityReportRepository:
    """Dependency for MongoCommunityReportRepository."""
    return MongoCommunityReportRepository(db=db)


def get_cloudinary_service(
    settings: Settings = Depends(get_settings),
) -> CloudinaryService:
    """Dependency for CloudinaryService."""
    return CloudinaryService(settings=settings)


# ---------------------------------------------------------------------------
# Authentication & Security Dependencies
# ---------------------------------------------------------------------------

async def get_current_user_optional(
    authorization: Optional[str] = Header(default=None),
    user_repo: MongoUserRepository = Depends(get_user_repo),
) -> Optional[Dict[str, Any]]:
    """
    Extract user from Bearer JWT token if present. Returns None if unauthenticated.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization[7:].strip()
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None

    user_id = payload["sub"]
    user = await user_repo.get_by_id(user_id)
    if not user:
        # Fallback to verified JWT payload claims if database document is not found (e.g. testing / stateless)
        return {
            "id": user_id,
            "username": payload.get("username", "user"),
            "role": payload.get("role", "user"),
            "is_active": True,
        }
    return user



async def get_current_user(
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """
    Strict dependency requiring a valid authenticated user.
    """
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def require_admin(
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Authorization dependency ensuring the user possesses the ADMIN role.
    Returns HTTP 403 Forbidden if user lacks admin privileges.
    """
    role = str(user.get("role", "user")).lower()
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden. Administrator privileges required.",
        )
    return user



# ---------------------------------------------------------------------------
# Weather Provider & Service Dependencies
# ---------------------------------------------------------------------------

def get_weather_provider(settings: Settings = Depends(get_settings)) -> BaseWeatherProvider:
    """Dependency for obtaining the active weather provider via ProviderFactory."""
    from app.providers.provider_factory import ProviderFactory
    return ProviderFactory.create_provider(settings=settings)


def get_weather_service(
    settings: Settings = Depends(get_settings),
    provider: BaseWeatherProvider = Depends(get_weather_provider),
) -> WeatherService:
    """Dependency for WeatherService."""
    return WeatherService(provider=provider, settings=settings)


def get_forecast_service(
    settings: Settings = Depends(get_settings),
    provider: BaseWeatherProvider = Depends(get_weather_provider),
) -> ForecastService:
    """Dependency for ForecastService."""
    return ForecastService(provider=provider, settings=settings)


def get_alert_service(
    settings: Settings = Depends(get_settings),
    provider: BaseWeatherProvider = Depends(get_weather_provider),
    alert_repo: MongoAlertRepository = Depends(get_alert_repo),
) -> AlertService:
    """Dependency for AlertService."""
    return AlertService(provider=provider, alert_repo=alert_repo, settings=settings)


def get_geocoding_service(
    settings: Settings = Depends(get_settings),
    provider: BaseWeatherProvider = Depends(get_weather_provider),
) -> GeocodingService:
    """Dependency for GeocodingService."""
    return GeocodingService(provider=provider, settings=settings)


def get_llm_service(settings: Settings = Depends(get_settings)) -> LLMService:
    """Dependency for LLMService."""
    return LLMService(settings=settings)


# ---------------------------------------------------------------------------
# Step 7: Advanced Intelligence & Official Warning Dependencies
# ---------------------------------------------------------------------------

def get_official_warning_repo(db: Optional[AsyncIOMotorDatabase] = Depends(get_mongo_db)) -> "MongoOfficialWarningRepository":
    from app.db.mongo_repositories import MongoOfficialWarningRepository
    return MongoOfficialWarningRepository(db=db)


def get_advisory_repo(db: Optional[AsyncIOMotorDatabase] = Depends(get_mongo_db)) -> "MongoAdvisoryRepository":
    from app.db.mongo_repositories import MongoAdvisoryRepository
    return MongoAdvisoryRepository(db=db)


def get_provider_status_repo(db: Optional[AsyncIOMotorDatabase] = Depends(get_mongo_db)) -> "MongoProviderStatusRepository":
    from app.db.mongo_repositories import MongoProviderStatusRepository
    return MongoProviderStatusRepository(db=db)


def get_warning_service(
    provider: BaseWeatherProvider = Depends(get_weather_provider),
    warning_repo: "MongoOfficialWarningRepository" = Depends(get_official_warning_repo),
    settings: Settings = Depends(get_settings),
) -> "WarningService":
    from app.services.warning_service import WarningService
    return WarningService(provider=provider, warning_repo=warning_repo, settings=settings)


def get_advisory_service(
    provider: BaseWeatherProvider = Depends(get_weather_provider),
    advisory_repo: "MongoAdvisoryRepository" = Depends(get_advisory_repo),
    settings: Settings = Depends(get_settings),
) -> "AdvisoryService":
    from app.services.advisory_service import AdvisoryService
    return AdvisoryService(provider=provider, advisory_repo=advisory_repo, settings=settings)


def get_nowcast_service(
    provider: BaseWeatherProvider = Depends(get_weather_provider),
    settings: Settings = Depends(get_settings),
) -> "NowcastService":
    from app.services.nowcast_service import NowcastService
    return NowcastService(provider=provider, settings=settings)


def get_severe_weather_service(
    provider: BaseWeatherProvider = Depends(get_weather_provider),
    settings: Settings = Depends(get_settings),
) -> "SevereWeatherService":
    from app.services.severe_weather_service import SevereWeatherService
    return SevereWeatherService(provider=provider, settings=settings)


def get_location_intelligence_service(
    provider: BaseWeatherProvider = Depends(get_weather_provider),
    location_repo: MongoLocationRepository = Depends(get_location_repo),
    settings: Settings = Depends(get_settings),
) -> "LocationIntelligenceService":
    from app.services.location_intelligence_service import LocationIntelligenceService
    return LocationIntelligenceService(provider=provider, location_repo=location_repo, settings=settings)


def get_provider_health_service(
    status_repo: "MongoProviderStatusRepository" = Depends(get_provider_status_repo),
    settings: Settings = Depends(get_settings),
) -> "ProviderHealthService":
    from app.services.provider_health_service import ProviderHealthService
    return ProviderHealthService(status_repo=status_repo, settings=settings)


def get_chat_service(
    weather_service: WeatherService = Depends(get_weather_service),
    forecast_service: ForecastService = Depends(get_forecast_service),
    alert_service: AlertService = Depends(get_alert_service),
    llm_service: LLMService = Depends(get_llm_service),
    chat_repo: MongoChatHistoryRepository = Depends(get_chat_repo),
    warning_service: "WarningService" = Depends(get_warning_service),
    advisory_service: "AdvisoryService" = Depends(get_advisory_service),
    settings: Settings = Depends(get_settings),
) -> ChatService:
    """Dependency for ChatService."""
    return ChatService(
        weather_service=weather_service,
        forecast_service=forecast_service,
        alert_service=alert_service,
        llm_service=llm_service,
        chat_repo=chat_repo,
        warning_service=warning_service,
        advisory_service=advisory_service,
        settings=settings,
    )


def get_language_service() -> "LanguageService":
    """Dependency for LanguageService."""
    from app.services.language_service import language_service
    return language_service


def get_climate_repo(db: Optional[AsyncIOMotorDatabase] = Depends(get_mongo_db)) -> MongoClimateRepository:
    """Dependency for MongoClimateRepository."""
    return MongoClimateRepository(db=db)


def get_climate_ingestion_service(
    climate_repo: MongoClimateRepository = Depends(get_climate_repo),
) -> ClimateIngestionService:
    """Dependency for ClimateIngestionService."""
    return ClimateIngestionService(climate_repo=climate_repo)


def get_climate_service(
    climate_repo: MongoClimateRepository = Depends(get_climate_repo),
    ingestion_service: ClimateIngestionService = Depends(get_climate_ingestion_service),
) -> ClimateService:
    """Dependency for ClimateService."""
    return ClimateService(climate_repo=climate_repo, ingestion_service=ingestion_service)


def get_radar_provider(
    settings: Settings = Depends(get_settings),
) -> "RadarProvider":
    """Dependency for Doppler Weather Radar Provider."""
    from app.providers.radar_provider import IMDRadarProvider
    return IMDRadarProvider(settings=settings)


def get_satellite_provider(
    settings: Settings = Depends(get_settings),
) -> "SatelliteProvider":
    """Dependency for Meteorological Satellite Provider."""
    from app.providers.satellite_provider import IMDSatelliteProvider
    return IMDSatelliteProvider(settings=settings)



