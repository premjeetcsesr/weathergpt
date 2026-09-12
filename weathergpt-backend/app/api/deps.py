from fastapi import Depends
from app.core.config import Settings, get_settings
from app.providers.base import BaseWeatherProvider
from app.providers.weather_provider import OpenWeatherMapProvider
from app.services.alert_service import AlertService
from app.services.chat_service import ChatService
from app.services.forecast_service import ForecastService
from app.services.geocoding_service import GeocodingService
from app.services.llm_service import LLMService
from app.services.weather_service import WeatherService


def get_weather_provider(settings: Settings = Depends(get_settings)) -> BaseWeatherProvider:
    """Dependency for obtaining the active weather provider."""
    return OpenWeatherMapProvider(settings=settings)


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
) -> AlertService:
    """Dependency for AlertService."""
    return AlertService(provider=provider, settings=settings)


def get_geocoding_service(
    settings: Settings = Depends(get_settings),
    provider: BaseWeatherProvider = Depends(get_weather_provider),
) -> GeocodingService:
    """Dependency for GeocodingService."""
    return GeocodingService(provider=provider, settings=settings)


def get_llm_service(settings: Settings = Depends(get_settings)) -> LLMService:
    """Dependency for LLMService."""
    return LLMService(settings=settings)


def get_chat_service(
    weather_service: WeatherService = Depends(get_weather_service),
    forecast_service: ForecastService = Depends(get_forecast_service),
    alert_service: AlertService = Depends(get_alert_service),
    llm_service: LLMService = Depends(get_llm_service),
    settings: Settings = Depends(get_settings),
) -> ChatService:
    """Dependency for ChatService."""
    return ChatService(
        weather_service=weather_service,
        forecast_service=forecast_service,
        alert_service=alert_service,
        llm_service=llm_service,
        settings=settings,
    )
