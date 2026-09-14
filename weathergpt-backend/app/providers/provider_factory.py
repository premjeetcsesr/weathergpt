"""
Weather Provider Factory & Multi-Provider Resolution Layer.
Handles dynamic provider instantiation, fallback mechanics, and source transparency.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from app.core.config import Settings, get_settings
from app.core.logging import logger
from app.providers.base import WeatherProvider
from app.providers.imd_provider import IMDProvider
from app.providers.nwp_provider import DefaultNWPProvider, NWPProvider
from app.providers.openweather_provider import OpenWeatherProvider
from app.providers.radar_provider import DefaultRadarProvider, RadarProvider
from app.providers.satellite_provider import DefaultSatelliteProvider, SatelliteProvider


class FallbackWeatherProvider(WeatherProvider):
    """
    Transparent composite provider that attempts primary provider (e.g. IMD)
    and falls back to OpenWeatherMap upon failure or missing configuration,
    ensuring that the source is ALWAYS accurately attributed and never misleading.
    """

    def __init__(
        self,
        primary: WeatherProvider,
        fallback: WeatherProvider,
    ):
        self.primary = primary
        self.fallback = fallback

    @property
    def provider_name(self) -> str:
        return f"{self.primary.provider_name} (with {self.fallback.provider_name} fallback)"

    async def get_current_weather(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Dict[str, Any]:
        if hasattr(self.primary, "is_configured") and getattr(self.primary, "is_configured"):
            try:
                res = await self.primary.get_current_weather(city=city, lat=lat, lon=lon)
                return res
            except Exception as exc:
                logger.warning(
                    f"Primary provider '{self.primary.provider_name}' failed for '{city}': {exc}. "
                    f"Activating transparent fallback to '{self.fallback.provider_name}'."
                )

        # Use fallback provider
        return await self.fallback.get_current_weather(city=city, lat=lat, lon=lon)

    async def get_forecast(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Dict[str, Any]:
        if hasattr(self.primary, "is_configured") and getattr(self.primary, "is_configured"):
            try:
                return await self.primary.get_forecast(city=city, lat=lat, lon=lon)
            except Exception as exc:
                logger.warning(f"Primary forecast provider failed: {exc}. Using fallback.")

        return await self.fallback.get_forecast(city=city, lat=lat, lon=lon)

    async def get_alerts(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        # For official alerts, prefer primary (e.g. IMD). If unconfigured or returns empty, fallback to openweather
        if hasattr(self.primary, "is_configured") and getattr(self.primary, "is_configured"):
            try:
                primary_alerts = await self.primary.get_alerts(city=city, lat=lat, lon=lon)
                if primary_alerts:
                    return primary_alerts
            except Exception as exc:
                logger.warning(f"Primary alert provider failed: {exc}")

        return await self.fallback.get_alerts(city=city, lat=lat, lon=lon)

    async def get_warnings(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        return await self.get_alerts(city=city, lat=lat, lon=lon)

    async def get_nowcast(
        self,
        city: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> Dict[str, Any]:
        if hasattr(self.primary, "is_configured") and getattr(self.primary, "is_configured"):
            try:
                res = await self.primary.get_nowcast(city=city, lat=lat, lon=lon)
                if res.get("available"):
                    return res
            except Exception:
                pass
        return await self.fallback.get_nowcast(city=city, lat=lat, lon=lon)

    async def search_locations(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        return await self.fallback.search_locations(query=query, limit=limit)

    async def reverse_geocode(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        return await self.fallback.reverse_geocode(lat=lat, lon=lon)


class ProviderFactory:
    """
    Factory to construct and return WeatherProvider implementations.
    """

    @staticmethod
    def create_provider(
        provider_name: Optional[str] = None,
        settings: Optional[Settings] = None
    ) -> WeatherProvider:
        cfg = settings or get_settings()
        selected = (provider_name or cfg.DEFAULT_WEATHER_PROVIDER or "openweather").lower().strip()

        openweather = OpenWeatherProvider(settings=cfg)
        imd = IMDProvider(settings=cfg)

        if selected == "imd":
            if imd.is_configured:
                # Wrap with fallback if IMD is live
                return FallbackWeatherProvider(primary=imd, fallback=openweather)
            # If specifically requested IMD, return IMDProvider which will state unconfigured
            return imd
        elif selected == "composite":
            return FallbackWeatherProvider(primary=imd, fallback=openweather)
        else:
            return openweather

    @staticmethod
    def get_nwp_provider(settings: Optional[Settings] = None) -> NWPProvider:
        return DefaultNWPProvider(settings=settings)

    @staticmethod
    def get_radar_provider(settings: Optional[Settings] = None) -> RadarProvider:
        return DefaultRadarProvider(settings=settings)

    @staticmethod
    def get_satellite_provider(settings: Optional[Settings] = None) -> SatelliteProvider:
        return DefaultSatelliteProvider(settings=settings)

    @staticmethod
    def get_all_provider_statuses(settings: Optional[Settings] = None) -> List[Dict[str, Any]]:
        cfg = settings or get_settings()
        imd = IMDProvider(settings=cfg)
        openweather = OpenWeatherProvider(settings=cfg)
        nwp = DefaultNWPProvider(settings=cfg)
        radar = DefaultRadarProvider(settings=cfg)
        satellite = DefaultSatelliteProvider(settings=cfg)

        now = datetime.now(timezone.utc).isoformat()

        return [
            {
                "provider_id": "openweather",
                "name": "OpenWeatherMap",
                "type": "weather",
                "category": "Commercial Global Weather API",
                "status": "ACTIVE" if bool(cfg.WEATHER_API_KEY) else "NOT_CONFIGURED",
                "configured": bool(cfg.WEATHER_API_KEY),
                "is_primary": cfg.DEFAULT_WEATHER_PROVIDER.lower() == "openweather",
                "notes": "Active operational provider for real-time global telemetry.",
                "last_checked": now,
            },
            {
                "provider_id": "imd",
                "name": "India Meteorological Department (IMD)",
                "type": "meteorological",
                "category": "Official Government Meteorological Service",
                "status": "ACTIVE" if imd.is_configured else "NOT_CONFIGURED",
                "configured": imd.is_configured,
                "is_primary": cfg.DEFAULT_WEATHER_PROVIDER.lower() == "imd",
                "notes": (
                    "Connected to official IMD National Weather Services"
                    if imd.is_configured
                    else "Set IMD_API_BASE_URL and IMD_API_KEY to activate."
                ),
                "last_checked": now,
            },
            {
                "provider_id": "radar",
                "name": "Doppler Radar",
                "type": "radar",
                "category": "High-Resolution Reflectivity Radar",
                "status": "ACTIVE" if radar.is_configured else "NOT_CONFIGURED",
                "configured": radar.is_configured,
                "is_primary": False,
                "notes": "Doppler Weather Radar S-band/C-band reflectivity mosaic.",
                "last_checked": now,
            },
            {
                "provider_id": "satellite",
                "name": "INSAT-3D",
                "type": "satellite",
                "category": "Geostationary Meteorological Satellite",
                "status": "ACTIVE" if satellite.is_configured else "NOT_CONFIGURED",
                "configured": satellite.is_configured,
                "is_primary": False,
                "notes": "INSAT-3D/3DR multispectral thermal infrared and cloud telemetry.",
                "last_checked": now,
            },
            {
                "provider_id": "nwp",
                "name": "Numerical Weather Prediction (NWP)",
                "type": "nwp",
                "category": "Numerical Physics Modeling System",
                "status": "ACTIVE" if nwp.is_configured else "NOT_CONFIGURED",
                "configured": nwp.is_configured,
                "is_primary": False,
                "notes": "Architecture ready; awaiting GFS/WRF model assimilation feeds.",
                "last_checked": now,
            },
        ]
