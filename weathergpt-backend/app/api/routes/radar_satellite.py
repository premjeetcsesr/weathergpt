"""
Doppler Radar & Meteorological Satellite Imagery REST Endpoints & Secure Proxy.
Implements Steps 5 & 6 of WeatherGPT Architecture:
- Real-time provider status checks
- Product catalog exploration
- Leaflet-compatible layer metadata & bounds
- Server-side secure tile and image proxy with strict SSRF defense
"""

from typing import Any, Dict, List, Optional
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
import httpx

from app.api.deps import get_radar_provider, get_satellite_provider
from app.core.config import Settings, get_settings
from app.core.logging import logger
from app.providers.radar_provider import RadarProvider
from app.providers.satellite_provider import SatelliteProvider
from app.schemas.radar_satellite import (
    ProviderState,
    RadarLayerResponse,
    RadarProductListResponse,
    RadarStatusResponse,
    SatelliteLayerResponse,
    SatelliteProductListResponse,
    SatelliteStatusResponse,
)

router = APIRouter(prefix="/weather", tags=["Radar & Satellite Imagery"])

# 1x1 Transparent PNG for unconfigured or off-bound tiles
TRANSPARENT_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00"
    b"\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
)


def validate_proxy_host(target_url: str, settings: Settings):
    """
    Ensure the target URL host is explicitly allowed to prevent SSRF attacks.
    """
    parsed = urlparse(target_url)
    hostname = (parsed.hostname or "").lower()
    allowed_hosts = [h.lower() for h in settings.ALLOWED_TILE_PROXY_HOSTS]

    if settings.IMD_RADAR_BASE_URL:
        radar_host = urlparse(settings.IMD_RADAR_BASE_URL).hostname
        if radar_host:
            allowed_hosts.append(radar_host.lower())

    if settings.IMD_SATELLITE_BASE_URL:
        sat_host = urlparse(settings.IMD_SATELLITE_BASE_URL).hostname
        if sat_host:
            allowed_hosts.append(sat_host.lower())

    if hostname not in allowed_hosts:
        logger.warning(f"SSRF violation attempt blocked: host '{hostname}' not in whitelist.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Host '{hostname}' is not authorized for server-side proxying.",
        )


# ===========================================================================
# Doppler Weather Radar (DWR) Endpoints
# ===========================================================================

@router.get(
    "/radar/status",
    summary="Get Doppler Radar Status",
    response_model=RadarStatusResponse,
    description="Operational status of Doppler Weather Radar feed (ACTIVE, CONFIGURED, NOT_CONFIGURED, UNAVAILABLE, ERROR).",
)
async def get_radar_status(
    radar_provider: RadarProvider = Depends(get_radar_provider),
) -> RadarStatusResponse:
    data = await radar_provider.get_status()
    return RadarStatusResponse(**data)


@router.get(
    "/radar/products",
    summary="Get Available Radar Products",
    response_model=RadarProductListResponse,
    description="List available Doppler radar products (reflectivity, precipitation intensity, 24h accumulation).",
)
async def get_radar_products(
    radar_provider: RadarProvider = Depends(get_radar_provider),
) -> RadarProductListResponse:
    status_data = await radar_provider.get_status()
    products = await radar_provider.get_available_products()
    return RadarProductListResponse(
        provider=radar_provider.provider_name,
        status=status_data["status"],
        products=products,
    )


@router.get(
    "/radar/layer",
    summary="Get Radar Map Layer Definition",
    response_model=RadarLayerResponse,
    description="Retrieve Leaflet-compatible radar layer definition, tile templates, bounds, and provenance.",
)
async def get_radar_layer(
    product: str = Query(default="reflectivity", description="Radar product code: reflectivity, precipitation_intensity, precipitation_accumulation"),
    radar_provider: RadarProvider = Depends(get_radar_provider),
) -> RadarLayerResponse:
    layer_data = await radar_provider.get_layer(product=product)
    return RadarLayerResponse(**layer_data)


@router.get(
    "/radar/tiles/{product}/{z}/{x}/{y}",
    summary="Proxy Doppler Radar Tiles",
    description="Securely proxy Doppler radar tiles without exposing private API keys to frontend Leaflet map.",
)
async def proxy_radar_tile(
    product: str,
    z: int,
    x: int,
    y: int,
    radar_provider: RadarProvider = Depends(get_radar_provider),
    settings: Settings = Depends(get_settings),
):
    if not (0 <= z <= 19 and x >= 0 and y >= 0):
        return Response(content=TRANSPARENT_PNG, media_type="image/png")

    if not radar_provider.is_configured:
        return Response(
            content=TRANSPARENT_PNG,
            media_type="image/png",
            headers={"X-Provider-Status": "NOT_CONFIGURED", "Cache-Control": "public, max-age=300"},
        )

    tile_bytes = await radar_provider.get_tile(product=product, z=z, x=x, y=y)
    if tile_bytes:
        return Response(
            content=tile_bytes,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=600", "X-Provider-Status": "ACTIVE"},
        )

    return Response(content=TRANSPARENT_PNG, media_type="image/png")


@router.get(
    "/radar/image",
    summary="Proxy Doppler Radar Composite Image",
    description="Securely proxy Doppler radar full-mosaic composite frame.",
)
async def proxy_radar_image(
    product: str = Query(default="reflectivity"),
    radar_provider: RadarProvider = Depends(get_radar_provider),
):
    if not radar_provider.is_configured:
        return Response(
            content=TRANSPARENT_PNG,
            media_type="image/png",
            headers={"X-Provider-Status": "NOT_CONFIGURED"},
        )

    image_bytes = await radar_provider.get_image(product=product)
    if image_bytes:
        return Response(
            content=image_bytes,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=600", "X-Provider-Status": "ACTIVE"},
        )

    return Response(content=TRANSPARENT_PNG, media_type="image/png")


# ===========================================================================
# Meteorological Satellite (INSAT-3D / 3DR / 3DS) Endpoints
# ===========================================================================

@router.get(
    "/satellite/status",
    summary="Get Satellite Feed Status",
    response_model=SatelliteStatusResponse,
    description="Operational status of INSAT-3D/3DR geostationary satellite telemetry pipeline.",
)
async def get_satellite_status(
    satellite_provider: SatelliteProvider = Depends(get_satellite_provider),
) -> SatelliteStatusResponse:
    data = await satellite_provider.get_status()
    return SatelliteStatusResponse(**data)


@router.get(
    "/satellite/products",
    summary="Get Available Satellite Products",
    response_model=SatelliteProductListResponse,
    description="List available multispectral satellite channels (VIS, TIR1, WV, Cloud Motion Vectors).",
)
async def get_satellite_products(
    satellite_provider: SatelliteProvider = Depends(get_satellite_provider),
) -> SatelliteProductListResponse:
    status_data = await satellite_provider.get_status()
    products = await satellite_provider.get_available_products()
    return SatelliteProductListResponse(
        provider=satellite_provider.provider_name,
        satellite="INSAT-3D",
        status=status_data["status"],
        products=products,
    )


@router.get(
    "/satellite/layer",
    summary="Get Satellite Map Layer Definition",
    response_model=SatelliteLayerResponse,
    description="Retrieve Leaflet-compatible satellite layer definition, tile templates, bounds, and provenance.",
)
async def get_satellite_layer(
    product: str = Query(default="visible", description="Channel code: visible, infrared_tir1, water_vapour, cloud_motion_vectors"),
    satellite_provider: SatelliteProvider = Depends(get_satellite_provider),
) -> SatelliteLayerResponse:
    layer_data = await satellite_provider.get_layer(product=product)
    return SatelliteLayerResponse(**layer_data)


@router.get(
    "/satellite/tiles/{product}/{z}/{x}/{y}",
    summary="Proxy Satellite Tiles",
    description="Securely proxy INSAT-3D channel tiles without exposing credentials to React client.",
)
async def proxy_satellite_tile(
    product: str,
    z: int,
    x: int,
    y: int,
    satellite_provider: SatelliteProvider = Depends(get_satellite_provider),
    settings: Settings = Depends(get_settings),
):
    if not (0 <= z <= 19 and x >= 0 and y >= 0):
        return Response(content=TRANSPARENT_PNG, media_type="image/png")

    if not satellite_provider.is_configured:
        return Response(
            content=TRANSPARENT_PNG,
            media_type="image/png",
            headers={"X-Provider-Status": "NOT_CONFIGURED", "Cache-Control": "public, max-age=300"},
        )

    tile_bytes = await satellite_provider.get_tile(product=product, zoom=z, x=x, y=y)
    if tile_bytes:
        return Response(
            content=tile_bytes,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=600", "X-Provider-Status": "ACTIVE"},
        )

    return Response(content=TRANSPARENT_PNG, media_type="image/png")


@router.get(
    "/satellite/image",
    summary="Proxy Satellite Composite Image",
    description="Securely proxy INSAT-3D sectoral or full-disk imagery frame.",
)
async def proxy_satellite_image(
    product: str = Query(default="visible"),
    satellite_provider: SatelliteProvider = Depends(get_satellite_provider),
):
    if not satellite_provider.is_configured:
        return Response(
            content=TRANSPARENT_PNG,
            media_type="image/png",
            headers={"X-Provider-Status": "NOT_CONFIGURED"},
        )

    image_bytes = await satellite_provider.get_image(product=product)
    if image_bytes:
        return Response(
            content=image_bytes,
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=600", "X-Provider-Status": "ACTIVE"},
        )

    return Response(content=TRANSPARENT_PNG, media_type="image/png")
