import pytest
import pytest_asyncio
from typing import Any, AsyncGenerator, Dict, List, Optional
import httpx
from httpx import ASGITransport
from app.main import app
from mongomock_motor import AsyncMongoMockClient
from app.api.deps import (
    get_alert_repo,
    get_alert_service,
    get_alert_sub_repo,
    get_chat_repo,
    get_chat_service,
    get_forecast_service,
    get_geocoding_service,
    get_location_repo,
    get_mongo_db,
    get_notification_history_repo,
    get_notification_repo,
    get_notification_service,
    get_user_repo,
    get_weather_history_repo,
    get_weather_provider,
    get_weather_service,
    get_websocket_manager,
    get_community_report_repo,
    get_cloudinary_service,
)
from app.db.mongo_repositories import (
    MongoAlertRepository,
    MongoAlertSubscriptionRepository,
    MongoChatHistoryRepository,
    MongoCommunityReportRepository,
    MongoLocationRepository,
    MongoNotificationHistoryRepository,
    MongoNotificationRepository,
    MongoUserRepository,
    MongoWeatherHistoryRepository,
    MongoOfficialWarningRepository,
    MongoAdvisoryRepository,
    MongoProviderStatusRepository,
)
from app.api.deps import (
    get_official_warning_repo,
    get_advisory_repo,
    get_provider_status_repo,
)
from app.providers.base import BaseWeatherProvider
from app.services.alert_service import AlertService
from app.services.chat_service import ChatService
from app.services.forecast_service import ForecastService
from app.services.geocoding_service import GeocodingService
from app.services.llm_service import LLMService
from app.services.weather_service import WeatherService
from app.services.cloudinary_service import CloudinaryService


class MockCloudinaryService(CloudinaryService):
    """Deterministic mock for Cloudinary image upload and deletion in tests."""

    def __init__(self):
        super().__init__()
        self._configured = True

    async def upload_image(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        return {
            "url": f"https://res.cloudinary.com/demo/image/upload/v12345/mock_{filename}",
            "public_id": f"weathergpt/community_reports/mock_{filename}",
            "format": "jpg",
            "bytes": len(file_bytes),
            "width": 800,
            "height": 600,
        }

    async def delete_image(self, public_id: str) -> bool:
        return True


class MockWeatherProvider(BaseWeatherProvider):
    """Deterministic mock weather provider for testing without live API keys."""

    async def get_current_weather(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Dict[str, Any]:
        if city.lower() == "nonexistentcity12345":
            from app.core.exceptions import LocationNotFoundError
            raise LocationNotFoundError(location=city)

        return {
            "weather": {
                "coord": {"lon": lon or 80.3319, "lat": lat or 26.4499},
                "weather": [
                    {"id": 801, "main": "Partly Cloudy", "description": "few clouds", "icon": "02d"}
                ],
                "main": {
                    "temp": 31.0,
                    "feels_like": 33.0,
                    "temp_min": 24.0,
                    "temp_max": 33.0,
                    "pressure": 1008,
                    "humidity": 78,
                    "sea_level": 126,
                },
                "visibility": 6500,
                "wind": {"speed": 4.4, "deg": 110},
                "clouds": {"all": 65},
                "dt": 1726056000,
                "sys": {"country": "IN", "sunrise": 1726013280, "sunset": 1726057320},
                "timezone": 19800,
                "name": city,
            },
            "air_pollution": {
                "list": [
                    {
                        "main": {"aqi": 3},
                        "components": {"pm2_5": 42.1, "pm10": 95.4},
                    }
                ]
            },
        }

    async def get_forecast(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Dict[str, Any]:
        list_items = []
        for i in range(12):
            list_items.append({
                "dt": 1726056000 + i * 10800,
                "main": {"temp": 28.0 + (i % 5), "humidity": 75},
                "weather": [{"main": "Clouds", "description": "scattered clouds", "icon": "03d"}],
                "wind": {"speed": 4.0},
                "pop": 0.35,
            })

        return {
            "city": {
                "name": city,
                "coord": {"lat": lat or 26.4499, "lon": lon or 80.3319},
                "timezone": 19800,
            },
            "list": list_items,
        }

    async def get_alerts(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        return []

    async def search_locations(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        return [
            {
                "name": query.capitalize(),
                "state": "Uttar Pradesh",
                "country": "India",
                "lat": 26.4499,
                "lon": 80.3319,
            }
        ]

    async def reverse_geocode(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        return {
            "name": "Kanpur",
            "state": "Uttar Pradesh",
            "country": "India",
            "lat": lat,
            "lon": lon,
        }


@pytest.fixture
def mock_provider() -> MockWeatherProvider:
    return MockWeatherProvider()


@pytest.fixture
def mock_mongo_db():
    client = AsyncMongoMockClient()
    return client["test_weathergpt"]


@pytest_asyncio.fixture
async def async_client(mock_provider: MockWeatherProvider, mock_mongo_db) -> AsyncGenerator[httpx.AsyncClient, None]:
    """Provide AsyncClient with mocked providers and async Mongo database."""
    user_repo = MongoUserRepository(db=mock_mongo_db)
    chat_repo = MongoChatHistoryRepository(db=mock_mongo_db)
    loc_repo = MongoLocationRepository(db=mock_mongo_db)
    weather_hist_repo = MongoWeatherHistoryRepository(db=mock_mongo_db)
    notification_repo = MongoNotificationRepository(db=mock_mongo_db)
    alert_repo = MongoAlertRepository(db=mock_mongo_db)
    sub_repo = MongoAlertSubscriptionRepository(db=mock_mongo_db)
    notif_hist_repo = MongoNotificationHistoryRepository(db=mock_mongo_db)

    alert_svc = AlertService(provider=mock_provider, alert_repo=alert_repo)
    weather_svc = WeatherService(provider=mock_provider)
    forecast_svc = ForecastService(provider=mock_provider)
    geocoding_svc = GeocodingService(provider=mock_provider)
    llm_svc = LLMService()

    warning_repo = MongoOfficialWarningRepository(db=mock_mongo_db)
    advisory_repo = MongoAdvisoryRepository(db=mock_mongo_db)
    provider_status_repo = MongoProviderStatusRepository(db=mock_mongo_db)
    community_report_repo = MongoCommunityReportRepository(db=mock_mongo_db)
    mock_cloudinary_svc = MockCloudinaryService()

    app.dependency_overrides[get_mongo_db] = lambda: mock_mongo_db
    app.dependency_overrides[get_user_repo] = lambda: user_repo
    app.dependency_overrides[get_chat_repo] = lambda: chat_repo
    app.dependency_overrides[get_location_repo] = lambda: loc_repo
    app.dependency_overrides[get_weather_history_repo] = lambda: weather_hist_repo
    app.dependency_overrides[get_notification_repo] = lambda: notification_repo
    app.dependency_overrides[get_alert_repo] = lambda: alert_repo
    app.dependency_overrides[get_alert_sub_repo] = lambda: sub_repo
    app.dependency_overrides[get_notification_history_repo] = lambda: notif_hist_repo
    app.dependency_overrides[get_official_warning_repo] = lambda: warning_repo
    app.dependency_overrides[get_advisory_repo] = lambda: advisory_repo
    app.dependency_overrides[get_provider_status_repo] = lambda: provider_status_repo
    app.dependency_overrides[get_community_report_repo] = lambda: community_report_repo
    app.dependency_overrides[get_cloudinary_service] = lambda: mock_cloudinary_svc

    app.dependency_overrides[get_weather_provider] = lambda: mock_provider
    app.dependency_overrides[get_weather_service] = lambda: weather_svc
    app.dependency_overrides[get_forecast_service] = lambda: forecast_svc
    app.dependency_overrides[get_geocoding_service] = lambda: geocoding_svc
    app.dependency_overrides[get_alert_service] = lambda: alert_svc
    app.dependency_overrides[get_chat_service] = lambda: ChatService(
        weather_service=weather_svc,
        forecast_service=forecast_svc,
        alert_service=alert_svc,
        llm_service=llm_svc,
        chat_repo=chat_repo,
    )

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()

