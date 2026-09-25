import json
from functools import lru_cache
from typing import List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment and .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Application
    PROJECT_NAME: str = "WeatherGPT API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    @field_validator("DEBUG", mode="after")
    @classmethod
    def enforce_production_debug(cls, v: bool, info) -> bool:
        env = info.data.get("ENVIRONMENT", "development")
        if str(env).lower() == "production":
            return False
        return v

    # External Weather Provider (OpenWeatherMap)
    WEATHER_API_KEY: str = ""
    WEATHER_API_BASE_URL: str = "https://api.openweathermap.org/data/2.5"
    GEOCODING_API_BASE_URL: str = "https://api.openweathermap.org/geo/1.0"
    VISUAL_CROSSING_API_KEY: Optional[str] = None
    VISUAL_CROSSING_API_BASE_URL: str = "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline"

    # Official IMD Provider & Advanced Intelligence (Step 7)
    IMD_API_BASE_URL: Optional[str] = None
    IMD_API_KEY: Optional[str] = None
    DEFAULT_WEATHER_PROVIDER: str = "openweather"
    ENABLE_IMD_PROVIDER: bool = True
    ENABLE_NWP_PROVIDER: bool = False
    ENABLE_RADAR_PROVIDER: bool = False
    ENABLE_SATELLITE_PROVIDER: bool = False

    # Doppler Weather Radar Provider (IMD / Authorized Network)
    IMD_RADAR_ENABLED: bool = False
    IMD_RADAR_BASE_URL: Optional[str] = None
    IMD_RADAR_API_KEY: Optional[str] = None

    # Meteorological Satellite Provider (INSAT-3D / 3DR / 3DS)
    IMD_SATELLITE_ENABLED: bool = False
    IMD_SATELLITE_BASE_URL: Optional[str] = None
    IMD_SATELLITE_API_KEY: Optional[str] = None

    # Proxy Whitelist for SSRF Defense
    ALLOWED_TILE_PROXY_HOSTS: List[str] = [
        "tile.openweathermap.org",
        "mausam.imd.gov.in",
        "satellite.imd.gov.in",
        "mosdac.gov.in",
        "bhuvan.nrsc.gov.in",
    ]

    # Cloudinary Image Storage
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None
    CLOUDINARY_URL: Optional[str] = None
    CLOUDINARY_FOLDER: str = "weathergpt/community_reports"
    COMMUNITY_REPORT_MAX_IMAGE_SIZE: int = 5 * 1024 * 1024  # 5 MB
    COMMUNITY_REPORT_RATE_LIMIT_PER_10_MIN: int = 5

    # Google Maps Platform APIs
    GOOGLE_PLACES_API_KEY: Optional[str] = None
    GOOGLE_GEOCODING_API_KEY: Optional[str] = None
    GOOGLE_ROUTES_API_KEY: Optional[str] = None
    GOOGLE_MAPS_JAVASCRIPT_API_KEY: Optional[str] = None

    # Database (PostgreSQL optional & MongoDB)
    DATABASE_URL: str = ""
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_URI: str = ""
    MONGODB_DB_NAME: str = "weathergpt"

    @property
    def effective_mongodb_url(self) -> str:
        return self.MONGODB_URI if self.MONGODB_URI else self.MONGODB_URL

    # Authentication & Security
    JWT_SECRET_KEY: str = "weathergpt-secret-key-super-secure-production-ready-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Rate Limiting (Step 8)
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_LOGIN_PER_MINUTE: int = 5
    RATE_LIMIT_REGISTER_PER_MINUTE: int = 5
    RATE_LIMIT_CHAT_PER_MINUTE: int = 30
    RATE_LIMIT_WEATHER_PER_MINUTE: int = 60

    # LLM Settings (OpenAI-compatible)
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_BASE_URL: str = "https://api.openai.com/v1"

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, set)):
            return list(v)
        return ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Caching & Timeouts
    CACHE_TTL_SECONDS: int = 300  # 5 minutes
    WEATHER_CACHE_TTL: int = 300
    HTTP_TIMEOUT_SECONDS: float = 10.0

    # Step 4 Real-Time Alerts & WebSocket
    ALERT_CHECK_INTERVAL_SECONDS: int = 300
    WEBSOCKET_ENABLED: bool = True
    MAX_WS_CONNECTIONS: int = 100
    MONGODB_DATABASE: Optional[str] = None

    @property
    def effective_db_name(self) -> str:
        return self.MONGODB_DATABASE or self.MONGODB_DB_NAME or "weathergpt"


@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()
