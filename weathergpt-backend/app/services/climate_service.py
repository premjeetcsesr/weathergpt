import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from app.core.logging import logger
from app.db.mongo_repositories import MongoClimateRepository
from app.schemas.climate import (
    ClimateAnomalyItem,
    ClimateAnomalyResponse,
    ClimateComparisonResponse,
    ClimateLocationInfo,
    ClimatePeriodInfo,
    ClimateSummaryMetrics,
    ClimateSummaryResponse,
    HumidityPoint,
    HumiditySeriesResponse,
    PeriodComparisonMetric,
    RainfallPoint,
    RainfallSeriesResponse,
    TemperaturePoint,
    TemperatureSeriesResponse,
    TrendInfo,
)
from app.services.climate_ingestion_service import ClimateIngestionService


class ClimateService:
    """
    Core analytics service for historical meteorological aggregations,
    linear trend analysis, Z-score anomaly classification, and period comparisons.
    """

    def __init__(
        self,
        climate_repo: MongoClimateRepository,
        ingestion_service: Optional[ClimateIngestionService] = None,
        ttl_seconds: int = 900,  # 15 minutes cache
    ):
        self.repo = climate_repo
        self.ingestion_service = ingestion_service or ClimateIngestionService(climate_repo)
        self._cache: Dict[str, Tuple[float, Any]] = {}
        self.ttl = ttl_seconds

    def _get_cache_key(self, endpoint: str, city: str, start: str, end: str) -> str:
        return f"{endpoint}:{city.lower().strip()}:{start}:{end}"

    def _get_cached(self, key: str) -> Optional[Any]:
        if key in self._cache:
            ts, data = self._cache[key]
            if time.time() - ts < self.ttl:
                return data
            del self._cache[key]
        return None

    def _set_cached(self, key: str, data: Any) -> None:
        self._cache[key] = (time.time(), data)

    def _resolve_date_range(
        self,
        range_key: Optional[str] = "last_30_days",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Tuple[str, str, str]:
        """Convert relative period key or explicit date strings into (start_date, end_date, resolved_key)."""
        today = datetime.now(timezone.utc).date()

        if start_date and end_date:
            return start_date, end_date, "custom"

        if range_key == "last_7_days":
            s = today - timedelta(days=7)
            return s.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d"), "last_7_days"
        elif range_key == "last_3_months":
            s = today - timedelta(days=90)
            return s.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d"), "last_3_months"
        elif range_key == "last_6_months":
            s = today - timedelta(days=180)
            return s.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d"), "last_6_months"
        elif range_key == "last_1_year":
            s = today - timedelta(days=365)
            return s.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d"), "last_1_year"
        else:  # default last_30_days
            s = today - timedelta(days=30)
            return s.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d"), "last_30_days"

    def _calculate_linear_trend(self, values: List[float], unit: str) -> TrendInfo:
        """Compute ordinary least-squares linear regression slope (y = mx + b)."""
        n = len(values)
        if n < 2:
            return TrendInfo(
                direction="stable",
                slope=0.0,
                unit=unit,
                description=f"Insufficient observations to compute linear trend ({n} records).",
            )

        x_coords = list(range(n))
        sum_x = sum(x_coords)
        sum_y = sum(values)
        sum_xy = sum(x * y for x, y in zip(x_coords, values))
        sum_xx = sum(x * x for x in x_coords)

        denom = (n * sum_xx) - (sum_x * sum_x)
        if denom == 0:
            slope = 0.0
        else:
            slope = ((n * sum_xy) - (sum_x * sum_y)) / denom

        slope_rounded = round(slope, 3)
        if slope_rounded > 0.015:
            direction = "increasing"
            desc = f"Shows an increasing trend of +{slope_rounded} {unit} over the observed period."
        elif slope_rounded < -0.015:
            direction = "decreasing"
            desc = f"Shows a decreasing trend of {slope_rounded} {unit} over the observed period."
        else:
            direction = "stable"
            desc = f"Maintains a generally stable baseline with minor fluctuations (slope: {slope_rounded} {unit})."

        return TrendInfo(
            direction=direction,
            slope=slope_rounded,
            unit=unit,
            description=desc,
        )

    async def get_climate_summary(
        self,
        city: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        range_key: Optional[str] = "last_30_days",
        lat: Optional[float] = None,
        lon: Optional[float] = None,
    ) -> ClimateSummaryResponse:
        """Retrieve overall climate statistics for a location and period."""
        s_date, e_date, r_key = self._resolve_date_range(range_key, start_date, end_date)
        cache_key = self._get_cache_key("summary", city, s_date, e_date)
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        # Auto-seed verified baseline for known demo locations if collection empty
        await self.ingestion_service.seed_historical_baseline_if_needed(city)

        records = await self.repo.get_records(city=city, start_date=s_date, end_date=e_date, lat=lat, lon=lon)
        loc_name = city.title().strip()

        if not records:
            res = ClimateSummaryResponse(
                success=True,
                location=ClimateLocationInfo(name=loc_name, lat=lat, lon=lon),
                period=ClimatePeriodInfo(start_date=s_date, end_date=e_date, range_key=r_key),
                metrics=ClimateSummaryMetrics(),
                data_available=False,
                source="Configured Meteorological Source",
                message="Historical climate data is not available for this period from the configured source.",
            )
            self._set_cached(cache_key, res)
            return res

        first_rec = records[0]
        rec_lat = first_rec.get("location", {}).get("lat", lat)
        rec_lon = first_rec.get("location", {}).get("lon", lon)
        source = first_rec.get("source", "Meteorological Observatory Archive")

        temp_avgs = [r["temperature"]["avg"] for r in records if "temperature" in r and "avg" in r["temperature"]]
        temp_maxs = [r["temperature"]["max"] for r in records if "temperature" in r and "max" in r["temperature"]]
        temp_mins = [r["temperature"]["min"] for r in records if "temperature" in r and "min" in r["temperature"]]
        rainfalls = [r.get("rainfall", 0.0) for r in records]
        humidities = [r.get("humidity", 0.0) for r in records if "humidity" in r]
        winds = [r.get("wind_speed", 0.0) for r in records if "wind_speed" in r]

        avg_temp = round(sum(temp_avgs) / len(temp_avgs), 1) if temp_avgs else None
        max_temp = round(max(temp_maxs), 1) if temp_maxs else None
        min_temp = round(min(temp_mins), 1) if temp_mins else None
        total_rain = round(sum(rainfalls), 1)
        avg_hum = round(sum(humidities) / len(humidities), 1) if humidities else None
        avg_wind = round(sum(winds) / len(winds), 1) if winds else None
        rainy_days = sum(1 for r in rainfalls if r >= 0.1)

        extreme_events = sum(
            1
            for r in records
            if (
                r.get("temperature", {}).get("max", 0) >= 42.0
                or r.get("rainfall", 0) >= 50.0
                or r.get("wind_speed", 0) >= 35.0
            )
        )

        metrics = ClimateSummaryMetrics(
            avg_temperature=avg_temp,
            max_temperature=max_temp,
            min_temperature=min_temp,
            total_rainfall=total_rain,
            avg_humidity=avg_hum,
            avg_wind_speed=avg_wind,
            rainy_days=rainy_days,
            extreme_weather_events=extreme_events,
        )

        res = ClimateSummaryResponse(
            success=True,
            location=ClimateLocationInfo(name=loc_name, lat=rec_lat, lon=rec_lon),
            period=ClimatePeriodInfo(start_date=s_date, end_date=e_date, range_key=r_key),
            metrics=metrics,
            data_available=True,
            source=source,
        )
        self._set_cached(cache_key, res)
        return res

    async def get_temperature_trend(
        self,
        city: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        range_key: Optional[str] = "last_30_days",
    ) -> TemperatureSeriesResponse:
        """Fetch temperature time-series observations and linear trend slope."""
        s_date, e_date, r_key = self._resolve_date_range(range_key, start_date, end_date)
        cache_key = self._get_cache_key("temperature", city, s_date, e_date)
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        await self.ingestion_service.seed_historical_baseline_if_needed(city)
        records = await self.repo.get_records(city=city, start_date=s_date, end_date=e_date)
        loc_name = city.title().strip()

        if not records:
            res = TemperatureSeriesResponse(
                success=True,
                location=ClimateLocationInfo(name=loc_name),
                period=ClimatePeriodInfo(start_date=s_date, end_date=e_date, range_key=r_key),
                data_available=False,
                source="Configured Meteorological Source",
                message="Historical temperature data is not available for this period.",
            )
            self._set_cached(cache_key, res)
            return res

        first_rec = records[0]
        points: List[TemperaturePoint] = []
        avg_list: List[float] = []

        for r in records:
            t = r.get("temperature", {})
            avg_val = t.get("avg", 25.0)
            min_val = t.get("min", avg_val)
            max_val = t.get("max", avg_val)
            points.append(TemperaturePoint(date=r["date"], avg=avg_val, min=min_val, max=max_val))
            avg_list.append(avg_val)

        trend = self._calculate_linear_trend(avg_list, unit="°C/day")

        res = TemperatureSeriesResponse(
            success=True,
            location=ClimateLocationInfo(
                name=loc_name,
                lat=first_rec.get("location", {}).get("lat"),
                lon=first_rec.get("location", {}).get("lon"),
            ),
            period=ClimatePeriodInfo(start_date=s_date, end_date=e_date, range_key=r_key),
            data_available=True,
            source=first_rec.get("source", "Meteorological Observatory Archive"),
            trend=trend,
            points=points,
        )
        self._set_cached(cache_key, res)
        return res

    async def get_rainfall_trend(
        self,
        city: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        range_key: Optional[str] = "last_30_days",
    ) -> RainfallSeriesResponse:
        """Fetch precipitation time-series and cumulative trend progress."""
        s_date, e_date, r_key = self._resolve_date_range(range_key, start_date, end_date)
        cache_key = self._get_cache_key("rainfall", city, s_date, e_date)
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        await self.ingestion_service.seed_historical_baseline_if_needed(city)
        records = await self.repo.get_records(city=city, start_date=s_date, end_date=e_date)
        loc_name = city.title().strip()

        if not records:
            res = RainfallSeriesResponse(
                success=True,
                location=ClimateLocationInfo(name=loc_name),
                period=ClimatePeriodInfo(start_date=s_date, end_date=e_date, range_key=r_key),
                data_available=False,
                source="Configured Meteorological Source",
                message="Historical rainfall data is not available for this period.",
            )
            self._set_cached(cache_key, res)
            return res

        first_rec = records[0]
        points: List[RainfallPoint] = []
        cumulative = 0.0
        rain_values: List[float] = []

        for r in records:
            rain = round(float(r.get("rainfall", 0.0)), 1)
            cumulative = round(cumulative + rain, 1)
            points.append(RainfallPoint(date=r["date"], rainfall=rain, cumulative=cumulative))
            rain_values.append(rain)

        total_rain = cumulative
        rainy_days = sum(1 for v in rain_values if v >= 0.1)
        trend = self._calculate_linear_trend(rain_values, unit="mm/day")

        res = RainfallSeriesResponse(
            success=True,
            location=ClimateLocationInfo(
                name=loc_name,
                lat=first_rec.get("location", {}).get("lat"),
                lon=first_rec.get("location", {}).get("lon"),
            ),
            period=ClimatePeriodInfo(start_date=s_date, end_date=e_date, range_key=r_key),
            data_available=True,
            source=first_rec.get("source", "Meteorological Observatory Archive"),
            total_rainfall=total_rain,
            rainy_days=rainy_days,
            trend=trend,
            points=points,
        )
        self._set_cached(cache_key, res)
        return res

    async def get_humidity_trend(
        self,
        city: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        range_key: Optional[str] = "last_30_days",
    ) -> HumiditySeriesResponse:
        """Fetch relative humidity time-series dataset."""
        s_date, e_date, r_key = self._resolve_date_range(range_key, start_date, end_date)
        cache_key = self._get_cache_key("humidity", city, s_date, e_date)
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        await self.ingestion_service.seed_historical_baseline_if_needed(city)
        records = await self.repo.get_records(city=city, start_date=s_date, end_date=e_date)
        loc_name = city.title().strip()

        if not records:
            res = HumiditySeriesResponse(
                success=True,
                location=ClimateLocationInfo(name=loc_name),
                period=ClimatePeriodInfo(start_date=s_date, end_date=e_date, range_key=r_key),
                data_available=False,
                source="Configured Meteorological Source",
                message="Historical humidity data is not available for this period.",
            )
            self._set_cached(cache_key, res)
            return res

        first_rec = records[0]
        points: List[HumidityPoint] = []
        hum_values: List[float] = []

        for r in records:
            h = round(float(r.get("humidity", 50.0)), 1)
            points.append(HumidityPoint(date=r["date"], humidity=h, min=max(0.0, h - 10), max=min(100.0, h + 10)))
            hum_values.append(h)

        avg_humidity = round(sum(hum_values) / len(hum_values), 1) if hum_values else 50.0
        trend = self._calculate_linear_trend(hum_values, unit="%/day")

        res = HumiditySeriesResponse(
            success=True,
            location=ClimateLocationInfo(
                name=loc_name,
                lat=first_rec.get("location", {}).get("lat"),
                lon=first_rec.get("location", {}).get("lon"),
            ),
            period=ClimatePeriodInfo(start_date=s_date, end_date=e_date, range_key=r_key),
            data_available=True,
            source=first_rec.get("source", "Meteorological Observatory Archive"),
            avg_humidity=avg_humidity,
            trend=trend,
            points=points,
        )
        self._set_cached(cache_key, res)
        return res

    async def get_anomalies(
        self,
        city: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        range_key: Optional[str] = "last_30_days",
    ) -> ClimateAnomalyResponse:
        """
        Calculate statistical Z-score anomalies:
        z = (observed_value - historical_mean) / standard_deviation
        |z| < 1 : Normal
        1 <= |z| < 2 : Moderate anomaly
        |z| >= 2 : Significant anomaly
        """
        s_date, e_date, r_key = self._resolve_date_range(range_key, start_date, end_date)
        cache_key = self._get_cache_key("anomalies", city, s_date, e_date)
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        await self.ingestion_service.seed_historical_baseline_if_needed(city)
        records = await self.repo.get_records(city=city, start_date=s_date, end_date=e_date)
        baseline = await self.repo.get_baseline_statistics(city=city)
        loc_name = city.title().strip()

        if not records or not baseline:
            res = ClimateAnomalyResponse(
                success=True,
                location=ClimateLocationInfo(name=loc_name),
                period=ClimatePeriodInfo(start_date=s_date, end_date=e_date, range_key=r_key),
                data_available=False,
                source="Configured Meteorological Source",
                message="Historical observations insufficient for anomaly calculation.",
            )
            self._set_cached(cache_key, res)
            return res

        first_rec = records[0]
        anomalies: List[ClimateAnomalyItem] = []

        # 1. Temperature Anomaly (Period Mean vs Baseline Mean)
        t_vals = [r["temperature"]["avg"] for r in records if "temperature" in r and "avg" in r["temperature"]]
        if t_vals:
            obs_temp = round(sum(t_vals) / len(t_vals), 1)
            mean_temp = baseline.get("temp_mean", obs_temp)
            std_temp = max(baseline.get("temp_std", 2.0), 0.5)
            z_temp = round((obs_temp - mean_temp) / std_temp, 2)

            abs_z = abs(z_temp)
            if abs_z >= 2.0:
                classification = "Significant anomaly"
                desc = (
                    f"Observed temperature ({obs_temp}°C) is significantly "
                    f"{'above' if z_temp > 0 else 'below'} the historical average ({mean_temp}°C) based on available baseline."
                )
            elif abs_z >= 1.0:
                classification = "Moderate anomaly"
                desc = (
                    f"Observed temperature ({obs_temp}°C) shows a moderate deviation "
                    f"from the historical baseline ({mean_temp}°C)."
                )
            else:
                classification = "Normal"
                desc = f"Observed temperature ({obs_temp}°C) is within normal statistical baseline range."

            anomalies.append(
                ClimateAnomalyItem(
                    metric="temperature",
                    observed_value=obs_temp,
                    baseline_mean=mean_temp,
                    standard_deviation=std_temp,
                    z_score=z_temp,
                    classification=classification,
                    description=desc,
                )
            )

        # 2. Rainfall Anomaly (Daily average observed in period vs Historical baseline daily mean)
        r_vals = [r.get("rainfall", 0.0) for r in records]
        if r_vals:
            obs_rain_mean = round(sum(r_vals) / len(r_vals), 1)
            mean_rain = baseline.get("rainfall_mean", obs_rain_mean)
            std_rain = max(baseline.get("rainfall_std", 3.0), 1.0)
            z_rain = round((obs_rain_mean - mean_rain) / std_rain, 2)

            abs_z = abs(z_rain)
            if abs_z >= 2.0:
                classification = "Significant anomaly"
                desc = (
                    f"Rainfall daily rate ({obs_rain_mean} mm/day) shows a significant "
                    f"{'excess' if z_rain > 0 else 'deficit'} compared to the historical baseline."
                )
            elif abs_z >= 1.0:
                classification = "Moderate anomaly"
                desc = (
                    f"Rainfall rate ({obs_rain_mean} mm/day) exhibits a moderate "
                    f"{'increase' if z_rain > 0 else 'drop'} from normal observed baseline."
                )
            else:
                classification = "Normal"
                desc = f"Rainfall rate ({obs_rain_mean} mm/day) is aligned with the expected seasonal baseline."

            anomalies.append(
                ClimateAnomalyItem(
                    metric="rainfall",
                    observed_value=obs_rain_mean,
                    baseline_mean=mean_rain,
                    standard_deviation=std_rain,
                    z_score=z_rain,
                    classification=classification,
                    description=desc,
                )
            )

        # 3. Humidity Anomaly
        h_vals = [r.get("humidity", 50.0) for r in records if "humidity" in r]
        if h_vals:
            obs_hum = round(sum(h_vals) / len(h_vals), 1)
            mean_hum = baseline.get("humidity_mean", obs_hum)
            std_hum = max(baseline.get("humidity_std", 8.0), 2.0)
            z_hum = round((obs_hum - mean_hum) / std_hum, 2)

            abs_z = abs(z_hum)
            if abs_z >= 2.0:
                classification = "Significant anomaly"
                desc = f"Atmospheric humidity ({obs_hum}%) significantly deviates from the available historical baseline."
            elif abs_z >= 1.0:
                classification = "Moderate anomaly"
                desc = f"Humidity levels ({obs_hum}%) exhibit moderate deviation from baseline."
            else:
                classification = "Normal"
                desc = f"Humidity levels ({obs_hum}%) remain within the normal baseline band."

            anomalies.append(
                ClimateAnomalyItem(
                    metric="humidity",
                    observed_value=obs_hum,
                    baseline_mean=mean_hum,
                    standard_deviation=std_hum,
                    z_score=z_hum,
                    classification=classification,
                    description=desc,
                )
            )

        res = ClimateAnomalyResponse(
            success=True,
            location=ClimateLocationInfo(
                name=loc_name,
                lat=first_rec.get("location", {}).get("lat"),
                lon=first_rec.get("location", {}).get("lon"),
            ),
            period=ClimatePeriodInfo(start_date=s_date, end_date=e_date, range_key=r_key),
            data_available=True,
            source=first_rec.get("source", "Meteorological Observatory Archive"),
            anomalies=anomalies,
        )
        self._set_cached(cache_key, res)
        return res

    async def get_comparison(
        self,
        city: str,
        range_key: Optional[str] = "last_30_days",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> ClimateComparisonResponse:
        """
        Compare current period vs previous equivalent period (e.g. current 30 days vs previous 30 days).
        Enforces strict data sufficiency before presenting comparisons.
        """
        s_date, e_date, r_key = self._resolve_date_range(range_key, start_date, end_date)
        dt_start = datetime.strptime(s_date, "%Y-%m-%d").date()
        dt_end = datetime.strptime(e_date, "%Y-%m-%d").date()
        period_days = (dt_end - dt_start).days + 1

        # Previous period of equal length immediately preceding
        prev_end = dt_start - timedelta(days=1)
        prev_start = prev_end - timedelta(days=period_days - 1)

        prev_s_date = prev_start.strftime("%Y-%m-%d")
        prev_e_date = prev_end.strftime("%Y-%m-%d")

        cache_key = self._get_cache_key("comparison", city, s_date, e_date)
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        await self.ingestion_service.seed_historical_baseline_if_needed(city)
        current_records = await self.repo.get_records(city=city, start_date=s_date, end_date=e_date)
        prev_records = await self.repo.get_records(city=city, start_date=prev_s_date, end_date=prev_e_date)
        loc_name = city.title().strip()

        # Check sufficiency: require at least 50% coverage of period days
        min_required = max(3, period_days // 2)
        has_sufficient_data = len(current_records) >= min_required and len(prev_records) >= min_required

        if not has_sufficient_data:
            res = ClimateComparisonResponse(
                success=True,
                location=ClimateLocationInfo(name=loc_name),
                comparison_label=f"Current {period_days} Days vs Previous {period_days} Days",
                current_period=ClimatePeriodInfo(start_date=s_date, end_date=e_date, range_key=r_key),
                previous_period=ClimatePeriodInfo(start_date=prev_s_date, end_date=prev_e_date, range_key="previous"),
                data_available=bool(current_records),
                sufficient_data_for_comparison=False,
                source="Meteorological Observatory Archive",
                message="Comparison unavailable: Insufficient historical records exist in the comparison time window.",
                metrics=[],
            )
            self._set_cached(cache_key, res)
            return res

        # 1. Temperature Comparison
        curr_temps = [r["temperature"]["avg"] for r in current_records if "temperature" in r and "avg" in r["temperature"]]
        prev_temps = [r["temperature"]["avg"] for r in prev_records if "temperature" in r and "avg" in r["temperature"]]
        curr_avg_t = round(sum(curr_temps) / len(curr_temps), 1)
        prev_avg_t = round(sum(prev_temps) / len(prev_temps), 1)
        t_delta = round(curr_avg_t - prev_avg_t, 1)
        t_pct = round((t_delta / prev_avg_t) * 100, 1) if prev_avg_t != 0 else None

        # 2. Rainfall Comparison
        curr_rains = sum(r.get("rainfall", 0.0) for r in current_records)
        prev_rains = sum(r.get("rainfall", 0.0) for r in prev_records)
        curr_rain_total = round(curr_rains, 1)
        prev_rain_total = round(prev_rains, 1)
        rain_delta = round(curr_rain_total - prev_rain_total, 1)
        rain_pct = (
            round((rain_delta / prev_rain_total) * 100, 1)
            if prev_rain_total > 0
            else (100.0 if curr_rain_total > 0 else 0.0)
        )

        # 3. Humidity Comparison
        curr_hums = [r.get("humidity", 50.0) for r in current_records if "humidity" in r]
        prev_hums = [r.get("humidity", 50.0) for r in prev_records if "humidity" in r]
        curr_hum_avg = round(sum(curr_hums) / len(curr_hums), 1)
        prev_hum_avg = round(sum(prev_hums) / len(prev_hums), 1)
        hum_delta = round(curr_hum_avg - prev_hum_avg, 1)
        hum_pct = round((hum_delta / prev_hum_avg) * 100, 1) if prev_hum_avg > 0 else None

        metrics = [
            PeriodComparisonMetric(
                metric_name="Average Temperature",
                current_value=curr_avg_t,
                previous_value=prev_avg_t,
                delta=t_delta,
                percentage_change=t_pct,
                unit="°C",
            ),
            PeriodComparisonMetric(
                metric_name="Total Rainfall",
                current_value=curr_rain_total,
                previous_value=prev_rain_total,
                delta=rain_delta,
                percentage_change=rain_pct,
                unit="mm",
            ),
            PeriodComparisonMetric(
                metric_name="Average Humidity",
                current_value=curr_hum_avg,
                previous_value=prev_hum_avg,
                delta=hum_delta,
                percentage_change=hum_pct,
                unit="%",
            ),
        ]

        res = ClimateComparisonResponse(
            success=True,
            location=ClimateLocationInfo(
                name=loc_name,
                lat=current_records[0].get("location", {}).get("lat"),
                lon=current_records[0].get("location", {}).get("lon"),
            ),
            comparison_label=f"Current {period_days} Days vs Previous {period_days} Days",
            current_period=ClimatePeriodInfo(start_date=s_date, end_date=e_date, range_key=r_key),
            previous_period=ClimatePeriodInfo(start_date=prev_s_date, end_date=prev_e_date, range_key="previous"),
            data_available=True,
            sufficient_data_for_comparison=True,
            source=current_records[0].get("source", "Meteorological Observatory Archive"),
            metrics=metrics,
        )
        self._set_cached(cache_key, res)
        return res
