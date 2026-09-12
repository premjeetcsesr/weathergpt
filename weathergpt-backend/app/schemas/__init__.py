from app.schemas.weather import WeatherResponse, LocationSchema, CurrentWeatherSchema, AirQualitySchema
from app.schemas.forecast import ForecastResponse, HourlyForecastItem, DailyForecastItem
from app.schemas.alerts import AlertsResponse, WeatherAlertItem
from app.schemas.location import LocationItem
from app.schemas.chat import ChatRequest, ChatResponse, WeatherContextSchema
from app.schemas.error import ErrorResponse, ErrorDetail

__all__ = [
    "WeatherResponse",
    "LocationSchema",
    "CurrentWeatherSchema",
    "AirQualitySchema",
    "ForecastResponse",
    "HourlyForecastItem",
    "DailyForecastItem",
    "AlertsResponse",
    "WeatherAlertItem",
    "LocationItem",
    "ChatRequest",
    "ChatResponse",
    "WeatherContextSchema",
    "ErrorResponse",
    "ErrorDetail",
]
