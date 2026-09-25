from typing import List, Optional
from pydantic import BaseModel, Field


class HourlyForecastItem(BaseModel):
    """Single hourly timeline forecast interval."""

    time: str = Field(..., examples=["18:00"], description="Formatted hour label or 'Now'")
    temperature: float = Field(..., examples=[30.0], description="Forecast temperature (°C)")
    condition: str = Field(..., examples=["Scattered Clouds"], description="Weather condition")
    icon: str = Field(default="cloud-sun", examples=["cloud-sun"], description="Weather icon key")
    pop: int = Field(..., examples=[25], description="Probability of precipitation (0-100%)")
    wind_speed: float = Field(..., examples=[15.0], description="Wind speed in km/h")
    humidity: int = Field(..., examples=[80], description="Relative humidity percentage")


class DailyForecastItem(BaseModel):
    """Single daily forecast outlook entry."""

    day: str = Field(..., examples=["Today"], description="Day name or 'Today'")
    date: str = Field(..., examples=["Sep 12"], description="Formatted date string (Month Day)")
    temp_min: float = Field(..., examples=[23.0], description="Forecast low temperature (°C)")
    temp_max: float = Field(..., examples=[31.0], description="Forecast high temperature (°C)")
    condition: str = Field(..., examples=["Heavy Showers"], description="Dominant weather condition")
    icon: str = Field(default="cloud-rain", examples=["cloud-rain"], description="Weather icon key")
    pop: int = Field(..., examples=[85], description="Peak probability of precipitation (0-100%)")
    summary: Optional[str] = Field(default=None, examples=["Widespread rain showers and gusty winds."], description="Short day summary")


class ForecastResponse(BaseModel):
    """Aggregated weather forecast response schema."""

    location: str = Field(..., examples=["Kanpur"], description="City name for the forecast")
    latitude: Optional[float] = Field(default=None, examples=[26.4499], description="Latitude")
    longitude: Optional[float] = Field(default=None, examples=[80.3319], description="Longitude")
    hourly: List[HourlyForecastItem] = Field(default_factory=list, description="Hourly forecast entries for next 24-36 hours")
    daily: List[DailyForecastItem] = Field(default_factory=list, description="Daily forecast entries for next 5-7 days")
    units: str = Field(default="metric", examples=["metric"], description="Unit system")
    source: str = Field(default="weather_provider", examples=["weather_provider"], description="Provider name")
