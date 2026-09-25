from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ClimateLocationInfo(BaseModel):
    """Location metadata for climate telemetry."""

    name: str = Field(default="Kanpur", examples=["Kanpur"])
    lat: Optional[float] = Field(default=None, examples=[26.4499])
    lon: Optional[float] = Field(default=None, examples=[80.3319])


class ClimatePeriodInfo(BaseModel):
    """Time window metadata."""

    start_date: str = Field(..., examples=["2026-08-01"])
    end_date: str = Field(..., examples=["2026-08-31"])
    range_key: Optional[str] = Field(default="last_30_days", examples=["last_30_days"])


class ClimateSummaryMetrics(BaseModel):
    """Aggregated numerical climate indicators."""

    avg_temperature: Optional[float] = Field(default=None, examples=[30.2])
    max_temperature: Optional[float] = Field(default=None, examples=[36.5])
    min_temperature: Optional[float] = Field(default=None, examples=[24.1])
    total_rainfall: Optional[float] = Field(default=None, examples=[142.0])
    avg_humidity: Optional[float] = Field(default=None, examples=[74.5])
    avg_wind_speed: Optional[float] = Field(default=None, examples=[11.2])
    rainy_days: int = Field(default=0, examples=[11])
    extreme_weather_events: Optional[int] = Field(default=0, examples=[2])


class ClimateSummaryResponse(BaseModel):
    """Overall climate summary response."""

    success: bool = Field(default=True)
    location: ClimateLocationInfo
    period: ClimatePeriodInfo
    metrics: ClimateSummaryMetrics
    data_available: bool = Field(default=True)
    source: str = Field(default="OpenWeatherMap / Meteorological Archive")
    last_updated: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    message: Optional[str] = Field(default=None)


class TrendInfo(BaseModel):
    """Linear regression trend indicators."""

    direction: str = Field(..., examples=["increasing", "decreasing", "stable"])
    slope: float = Field(..., examples=[0.04])
    unit: str = Field(default="°C/day", examples=["°C/day"])
    description: str = Field(..., examples=["Temperature shows an increasing trend over the selected period."])


class TemperaturePoint(BaseModel):
    """Individual temperature time-series reading."""

    date: str = Field(..., examples=["2026-08-01"])
    avg: float = Field(..., examples=[30.2])
    min: float = Field(..., examples=[25.1])
    max: float = Field(..., examples=[34.8])


class TemperatureSeriesResponse(BaseModel):
    """Time-series temperature readings and linear trend."""

    success: bool = Field(default=True)
    location: ClimateLocationInfo
    period: ClimatePeriodInfo
    data_available: bool = Field(default=True)
    source: str = Field(default="OpenWeatherMap / Meteorological Archive")
    last_updated: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    trend: Optional[TrendInfo] = None
    points: List[TemperaturePoint] = Field(default_factory=list)
    message: Optional[str] = None


class RainfallPoint(BaseModel):
    """Daily precipitation record."""

    date: str = Field(..., examples=["2026-08-01"])
    rainfall: float = Field(..., examples=[12.4])
    cumulative: float = Field(..., examples=[12.4])


class RainfallSeriesResponse(BaseModel):
    """Precipitation telemetry and cumulative progress."""

    success: bool = Field(default=True)
    location: ClimateLocationInfo
    period: ClimatePeriodInfo
    data_available: bool = Field(default=True)
    source: str = Field(default="OpenWeatherMap / Meteorological Archive")
    last_updated: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    total_rainfall: float = Field(default=0.0)
    rainy_days: int = Field(default=0)
    trend: Optional[TrendInfo] = None
    points: List[RainfallPoint] = Field(default_factory=list)
    message: Optional[str] = None


class HumidityPoint(BaseModel):
    """Atmospheric moisture record."""

    date: str = Field(..., examples=["2026-08-01"])
    humidity: float = Field(..., examples=[72.0])
    min: Optional[float] = Field(default=None)
    max: Optional[float] = Field(default=None)


class HumiditySeriesResponse(BaseModel):
    """Relative humidity time-series dataset."""

    success: bool = Field(default=True)
    location: ClimateLocationInfo
    period: ClimatePeriodInfo
    data_available: bool = Field(default=True)
    source: str = Field(default="OpenWeatherMap / Meteorological Archive")
    last_updated: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    avg_humidity: float = Field(default=0.0)
    trend: Optional[TrendInfo] = None
    points: List[HumidityPoint] = Field(default_factory=list)
    message: Optional[str] = None


class ClimateAnomalyItem(BaseModel):
    """Statistical Z-score observation."""

    metric: str = Field(..., examples=["temperature", "rainfall", "humidity"])
    date: Optional[str] = None
    observed_value: float = Field(..., examples=[34.5])
    baseline_mean: float = Field(..., examples=[30.2])
    standard_deviation: float = Field(..., examples=[2.1])
    z_score: float = Field(..., examples=[2.05])
    classification: str = Field(..., examples=["Significant anomaly", "Moderate anomaly", "Normal"])
    description: str = Field(
        ...,
        examples=["Observed temperature is significantly above the historical average based on available baseline."],
    )


class ClimateAnomalyResponse(BaseModel):
    """Calculated statistical climate anomaly evaluations."""

    success: bool = Field(default=True)
    location: ClimateLocationInfo
    period: ClimatePeriodInfo
    data_available: bool = Field(default=True)
    source: str = Field(default="OpenWeatherMap / Meteorological Archive")
    methodology: str = Field(
        default="Z-Score deviation from available observational baseline: |z|<1 Normal, 1<=|z|<2 Moderate, |z|>=2 Significant"
    )
    last_updated: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    anomalies: List[ClimateAnomalyItem] = Field(default_factory=list)
    message: Optional[str] = None


class PeriodComparisonMetric(BaseModel):
    """Comparison metric between two equivalent time windows."""

    metric_name: str = Field(..., examples=["Average Temperature", "Total Rainfall", "Average Humidity"])
    current_value: float = Field(..., examples=[31.2])
    previous_value: float = Field(..., examples=[29.8])
    delta: float = Field(..., examples=[1.4])
    percentage_change: Optional[float] = Field(default=None, examples=[4.7])
    unit: str = Field(..., examples=["°C", "mm", "%"])


class ClimateComparisonResponse(BaseModel):
    """Comparison between two equivalent climatological periods."""

    success: bool = Field(default=True)
    location: ClimateLocationInfo
    comparison_label: str = Field(..., examples=["Current 30 Days vs Previous 30 Days", "2026 vs 2025"])
    current_period: ClimatePeriodInfo
    previous_period: ClimatePeriodInfo
    data_available: bool = Field(default=True)
    sufficient_data_for_comparison: bool = Field(default=True)
    source: str = Field(default="OpenWeatherMap / Meteorological Archive")
    last_updated: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    metrics: List[PeriodComparisonMetric] = Field(default_factory=list)
    message: Optional[str] = None


class ClimateInsightRequest(BaseModel):
    """Input payload to request an AI natural-language climate summary."""

    location: str = Field(..., examples=["Kanpur"])
    period: str = Field(..., examples=["last 30 days"])
    metrics: Dict[str, Any] = Field(..., description="Verified calculated metrics dictionary")
    language: Optional[str] = Field(default="en", examples=["en", "hi"])


class ClimateInsightResponse(BaseModel):
    """Natural-language climate summary generated from verified telemetry."""

    success: bool = Field(default=True)
    location: str = Field(..., examples=["Kanpur"])
    period: str = Field(..., examples=["last 30 days"])
    language: str = Field(default="en", examples=["en", "hi"])
    insight: str = Field(..., description="Grounded natural-language explanation of verified metrics")
    ai_generated: bool = Field(default=False)
    source: str = Field(default="verified_climate_metrics")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
