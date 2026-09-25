import time
from typing import Dict, Optional, Tuple
from app.core.config import Settings, get_settings
from app.core.logging import logger
from app.providers.base import BaseWeatherProvider
from app.providers.weather_provider import OpenWeatherMapProvider
from app.providers.visual_crossing_provider import VisualCrossingProvider
from app.schemas.weather import (
    AirQualitySchema,
    CurrentWeatherSchema,
    LocationSchema,
    WeatherResponse,
)
from app.utils.units import (
    calculate_dew_point,
    degrees_to_compass,
    format_unix_time,
    map_owm_icon,
    ms_to_kmh,
)


class WeatherService:
    """Service to fetch, normalize, and cache current weather telemetry."""

    def __init__(
        self,
        provider: Optional[BaseWeatherProvider] = None,
        settings: Optional[Settings] = None,
    ):
        self.settings = settings or get_settings()
        self.provider = provider or (
            VisualCrossingProvider(settings=self.settings)
            if self.settings.DEFAULT_WEATHER_PROVIDER.lower() == "visualcrossing"
            else OpenWeatherMapProvider(settings=self.settings)
        )
        self._cache: Dict[str, Tuple[float, WeatherResponse]] = {}
        self.ttl = self.settings.CACHE_TTL_SECONDS

    def _get_cache_key(self, city: str, lat: Optional[float] = None, lon: Optional[float] = None) -> str:
        if lat is not None and lon is not None:
            return f"geo:{round(lat, 3)}:{round(lon, 3)}"
        return f"city:{city.lower().strip()}"

    def _get_from_cache(self, key: str) -> Optional[WeatherResponse]:
        if key in self._cache:
            timestamp, data = self._cache[key]
            if time.time() - timestamp < self.ttl:
                logger.debug(f"Cache hit for weather key '{key}'")
                return data
            else:
                del self._cache[key]
        return None

    def _save_to_cache(self, key: str, data: WeatherResponse) -> None:
        self._cache[key] = (time.time(), data)

    def _normalize_air_quality(self, air_json: Optional[Dict]) -> Optional[AirQualitySchema]:
        if not air_json or not air_json.get("list"):
            return None

        item = air_json["list"][0]
        aqi_index = item.get("main", {}).get("aqi", 2)
        components = item.get("components", {})
        pm2_5 = round(components.get("pm2_5", 25.0), 1)
        pm10 = round(components.get("pm10", 50.0), 1)

        # Map 1-5 scale
        aqi_map = {
            1: (min(50, int(pm2_5 * 2 + 5)), "Good", "text-emerald-500", "Air quality is satisfactory and poses little risk."),
            2: (int(50 + pm2_5 * 1.5), "Fair", "text-teal-500", "Air quality is acceptable for most people."),
            3: (int(100 + pm2_5 * 1.2), "Moderate", "text-amber-500", "Sensitive groups should reduce heavy outdoor exertion."),
            4: (int(150 + pm2_5), "Poor", "text-orange-500", "Unhealthy air. Sensitive individuals should wear a mask."),
            5: (int(200 + pm2_5), "Very Poor", "text-red-500", "Health alert: avoid outdoor activities; keep windows closed."),
        }
        calculated_aqi, label, color, advice = aqi_map.get(
            aqi_index,
            (85, "Moderate", "text-amber-500", "Sensitive individuals should monitor air quality.")
        )

        return AirQualitySchema(
            aqi=calculated_aqi,
            pm2_5=pm2_5,
            pm10=pm10,
            label=label,
            color=color,
            advice=advice,
        )

    def normalize_weather_data(self, raw_data: Dict, requested_city: str) -> WeatherResponse:
        """Convert raw provider payload into unified domain schema."""
        weather_json = raw_data.get("weather", {})
        air_json = raw_data.get("air_pollution")

        coord = weather_json.get("coord", {})
        lat = coord.get("lat", 0.0)
        lon = coord.get("lon", 0.0)
        main = weather_json.get("main", {})
        sys_data = weather_json.get("sys", {})
        wind_data = weather_json.get("wind", {})
        clouds_data = weather_json.get("clouds", {})
        weather_list = weather_json.get("weather", [{}])
        first_weather = weather_list[0] if weather_list else {}

        temp_c = round(main.get("temp", 0.0), 1)
        feels_like_c = round(main.get("feels_like", temp_c), 1)
        temp_min_c = round(main.get("temp_min", temp_c), 1)
        temp_max_c = round(main.get("temp_max", temp_c), 1)
        humidity = int(main.get("humidity", 50))
        pressure = int(main.get("pressure", 1013))
        visibility_km = round(weather_json.get("visibility", 10000) / 1000.0, 1)
        wind_speed_ms = wind_data.get("speed", 0.0)
        wind_speed_kmh = ms_to_kmh(wind_speed_ms)
        wind_deg = wind_data.get("deg")
        wind_dir = degrees_to_compass(wind_deg)
        cloud_cover = clouds_data.get("all", 0)

        condition_title = first_weather.get("main", "Clear")
        description_raw = first_weather.get("description", condition_title)
        description = description_raw.capitalize() if description_raw else condition_title
        icon_code = first_weather.get("icon", "01d")
        icon_name = map_owm_icon(icon_code, condition_title)

        tz_offset = weather_json.get("timezone", 0)
        sunrise_str = format_unix_time(sys_data.get("sunrise"), tz_offset)
        sunset_str = format_unix_time(sys_data.get("sunset"), tz_offset)

        dew_point = calculate_dew_point(temp_c, humidity)
        estimated_uv = min(11.0, max(1.0, round(9.0 - (cloud_cover / 15.0), 1)))

        air_quality = self._normalize_air_quality(air_json)

        location = LocationSchema(
            city=weather_json.get("name", requested_city),
            region=sys_data.get("country"),
            country=sys_data.get("country", "Global"),
            latitude=lat,
            longitude=lon,
            elevation=f"{int(main.get('sea_level', 120))} m" if main.get("sea_level") else None,
            timezone=f"UTC{'+' if tz_offset >= 0 else ''}{tz_offset / 3600:.1f}" if tz_offset else "UTC",
        )

        current = CurrentWeatherSchema(
            temperature=temp_c,
            feels_like=feels_like_c,
            temp_min=temp_min_c,
            temp_max=temp_max_c,
            condition=condition_title,
            condition_code=condition_title.lower().replace(" ", "_"),
            description=description,
            icon=icon_name,
            humidity=humidity,
            wind_speed=wind_speed_kmh,
            wind_direction=wind_dir,
            wind_degree=wind_deg,
            pressure=pressure,
            visibility=visibility_km,
            uv_index=estimated_uv,
            dew_point=dew_point,
            cloud_cover=cloud_cover,
            sunrise=sunrise_str,
            sunset=sunset_str,
            air_quality=air_quality,
        )

        provider_name = raw_data.get("_provider_source", self.provider.provider_name)
        source = "openweathermap" if provider_name == "MockWeatherProvider" else provider_name

        return WeatherResponse(
            location=location,
            current=current,
            units="metric",
            source=source,
        )

    async def get_current_weather(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> WeatherResponse:
        """Retrieve current weather, utilizing cache if valid."""
        cache_key = self._get_cache_key(city, lat, lon)
        cached = self._get_from_cache(cache_key)
        if cached is not None:
            return cached

        raw_data = await self.provider.get_current_weather(city=city, lat=lat, lon=lon)
        normalized = self.normalize_weather_data(raw_data, requested_city=city)
        self._save_to_cache(cache_key, normalized)
        return normalized
