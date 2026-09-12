import datetime
from collections import defaultdict
from typing import Dict, List, Optional
from app.core.config import Settings, get_settings
from app.providers.base import BaseWeatherProvider
from app.providers.weather_provider import OpenWeatherMapProvider
from app.schemas.forecast import DailyForecastItem, ForecastResponse, HourlyForecastItem
from app.utils.units import map_owm_icon, ms_to_kmh


class ForecastService:
    """Service to process and aggregate weather forecasts."""

    def __init__(
        self,
        provider: Optional[BaseWeatherProvider] = None,
        settings: Optional[Settings] = None,
    ):
        self.settings = settings or get_settings()
        self.provider = provider or OpenWeatherMapProvider(settings=self.settings)

    def normalize_forecast_data(self, raw_data: Dict, requested_city: str) -> ForecastResponse:
        """Process 5-day/3-hour forecast into hourly timeline and daily outlooks."""
        city_info = raw_data.get("city", {})
        city_name = city_info.get("name", requested_city)
        coord = city_info.get("coord", {})
        tz_offset = city_info.get("timezone", 0)
        forecast_list = raw_data.get("list", [])

        # 1. Hourly Timeline (First 8-10 intervals = next 24-30 hours)
        hourly_items: List[HourlyForecastItem] = []
        for idx, item in enumerate(forecast_list[:10]):
            dt_unix = item.get("dt", 0)
            tz = datetime.timezone(datetime.timedelta(seconds=tz_offset))
            local_dt = datetime.datetime.fromtimestamp(dt_unix, tz=tz)

            time_str = "Now" if idx == 0 else local_dt.strftime("%H:%M")
            main = item.get("main", {})
            weather_arr = item.get("weather", [{}])
            w_first = weather_arr[0] if weather_arr else {}
            condition_title = w_first.get("main", "Clear")
            icon_code = w_first.get("icon", "01d")
            pop_ratio = item.get("pop", 0.0)

            hourly_items.append(
                HourlyForecastItem(
                    time=time_str,
                    temperature=round(main.get("temp", 0.0), 1),
                    condition=w_first.get("description", condition_title).capitalize(),
                    icon=map_owm_icon(icon_code, condition_title),
                    pop=int(pop_ratio * 100),
                    wind_speed=ms_to_kmh(item.get("wind", {}).get("speed", 0.0)),
                    humidity=int(main.get("humidity", 50)),
                )
            )

        # 2. Daily Outlook (Group by local calendar date)
        daily_buckets: Dict[str, List[Dict]] = defaultdict(list)
        for item in forecast_list:
            dt_unix = item.get("dt", 0)
            tz = datetime.timezone(datetime.timedelta(seconds=tz_offset))
            local_dt = datetime.datetime.fromtimestamp(dt_unix, tz=tz)
            date_key = local_dt.strftime("%Y-%m-%d")
            daily_buckets[date_key].append(item)

        daily_items: List[DailyForecastItem] = []
        for idx, (date_key, items) in enumerate(list(daily_buckets.items())[:7]):
            temps = [it.get("main", {}).get("temp", 0.0) for it in items]
            pops = [it.get("pop", 0.0) for it in items]
            conditions = [it.get("weather", [{}])[0].get("main", "Clear") for it in items]
            icons = [it.get("weather", [{}])[0].get("icon", "01d") for it in items]

            min_temp = round(min(temps), 1) if temps else 0.0
            max_temp = round(max(temps), 1) if temps else 0.0
            peak_pop = int(max(pops) * 100) if pops else 0

            # Median condition of the day
            mid_idx = len(conditions) // 2
            dominant_condition = conditions[mid_idx] if conditions else "Clear"
            dominant_icon = icons[mid_idx] if icons else "01d"

            first_dt = datetime.datetime.fromtimestamp(
                items[0].get("dt", 0),
                tz=datetime.timezone(datetime.timedelta(seconds=tz_offset))
            )
            day_label = "Today" if idx == 0 else first_dt.strftime("%a")
            date_label = first_dt.strftime("%b %d")

            summary = f"{dominant_condition} with temperatures between {min_temp}°C and {max_temp}°C."

            daily_items.append(
                DailyForecastItem(
                    day=day_label,
                    date=date_label,
                    temp_min=min_temp,
                    temp_max=max_temp,
                    condition=dominant_condition,
                    icon=map_owm_icon(dominant_icon, dominant_condition),
                    pop=peak_pop,
                    summary=summary,
                )
            )

        return ForecastResponse(
            location=city_name,
            latitude=coord.get("lat"),
            longitude=coord.get("lon"),
            hourly=hourly_items,
            daily=daily_items,
            units="metric",
            source="openweathermap",
        )

    async def get_forecast(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> ForecastResponse:
        """Fetch and process forecast for a city or coordinates."""
        raw_data = await self.provider.get_forecast(city=city, lat=lat, lon=lon)
        return self.normalize_forecast_data(raw_data, requested_city=city)
