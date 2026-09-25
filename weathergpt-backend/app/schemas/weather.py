from typing import Optional
from pydantic import BaseModel, Field


class LocationSchema(BaseModel):
    """Geographical location metadata."""

    city: str = Field(..., examples=["Kanpur"], description="City or locality name")
    region: Optional[str] = Field(default=None, examples=["Uttar Pradesh"], description="State or province name")
    country: str = Field(..., examples=["India"], description="Country name or ISO code")
    latitude: float = Field(..., examples=[26.4499], description="Geographic latitude in decimal degrees")
    longitude: float = Field(..., examples=[80.3319], description="Geographic longitude in decimal degrees")
    elevation: Optional[str] = Field(default=None, examples=["126 m"], description="Elevation above sea level")
    timezone: Optional[str] = Field(default=None, examples=["Asia/Kolkata"], description="Timezone name or UTC offset")


class AirQualitySchema(BaseModel):
    """Air quality index and pollutant concentrations."""

    aqi: int = Field(..., examples=[112], description="Calculated Air Quality Index (AQI)")
    pm2_5: float = Field(..., examples=[42.1], description="Fine particulate matter PM2.5 in µg/m³")
    pm10: float = Field(..., examples=[95.4], description="Coarse particulate matter PM10 in µg/m³")
    label: str = Field(..., examples=["Moderate"], description="Air quality category label")
    color: str = Field(..., examples=["text-amber-500"], description="Suggested Tailwind CSS color class")
    advice: str = Field(..., examples=["Sensitive individuals should wear a mask outdoors."], description="Health advice")


class CurrentWeatherSchema(BaseModel):
    """Current atmospheric telemetry metrics."""

    temperature: float = Field(..., examples=[31.0], description="Temperature in selected units (°C for metric)")
    feels_like: float = Field(..., examples=[33.0], description="Apparent feels-like temperature")
    temp_min: Optional[float] = Field(default=None, examples=[24.0], description="Minimum recorded temperature today")
    temp_max: Optional[float] = Field(default=None, examples=[33.0], description="Maximum recorded temperature today")
    condition: str = Field(..., examples=["Partly Cloudy"], description="Primary weather condition description")
    condition_code: Optional[str] = Field(default=None, examples=["partly_cloudy"], description="Normalized condition identifier")
    description: Optional[str] = Field(default=None, examples=["Humid conditions with convective cloud cover."], description="Extended weather narrative")
    icon: Optional[str] = Field(default="cloud-sun", examples=["cloud-sun"], description="Weather icon identifier")
    humidity: int = Field(..., examples=[78], description="Relative humidity percentage (0-100%)")
    wind_speed: float = Field(..., examples=[16.0], description="Wind speed in km/h")
    wind_direction: str = Field(..., examples=["ESE"], description="Compass wind direction")
    wind_degree: Optional[int] = Field(default=None, examples=[110], description="Wind direction in degrees (0-360°)")
    pressure: int = Field(..., examples=[1008], description="Atmospheric pressure in hPa")
    visibility: float = Field(..., examples=[6.5], description="Atmospheric visibility in kilometers")
    uv_index: Optional[float] = Field(default=None, examples=[8.0], description="Ultraviolet radiation index (0-11+)")
    dew_point: Optional[float] = Field(default=None, examples=[24.0], description="Dew point temperature in °C")
    cloud_cover: Optional[int] = Field(default=None, examples=[65], description="Cloud cover percentage (0-100%)")
    sunrise: Optional[str] = Field(default=None, examples=["05:48 AM"], description="Formatted local sunrise time")
    sunset: Optional[str] = Field(default=None, examples=["06:22 PM"], description="Formatted local sunset time")
    air_quality: Optional[AirQualitySchema] = Field(default=None, description="Optional Air Quality Index data")


class WeatherResponse(BaseModel):
    """Normalized complete weather response schema."""

    location: LocationSchema
    current: CurrentWeatherSchema
    units: str = Field(default="metric", examples=["metric"], description="Unit system used for measurements")
    source: str = Field(default="weather_provider", examples=["weather_provider"], description="Data provider source identifier")
