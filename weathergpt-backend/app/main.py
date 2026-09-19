from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.router import api_router
from app.api.routes import health
from app.core.config import get_settings
from app.core.exceptions import AppException
from app.core.logging import RequestLoggingMiddleware, logger, setup_logging
from app.core.middleware import (
    CorrelationIdMiddleware,
    RateLimiterMiddleware,
    SecurityHeadersMiddleware,
)
from app.db.database import init_db
from app.db.mongodb import close_mongo_db, init_mongo_db

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown lifespan context."""
    setup_logging(debug=settings.DEBUG)
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")
    await init_db()
    db = await init_mongo_db()

    # Initialize Step 4 Alert Monitor background worker if MongoDB is available
    if db is not None:
        try:
            from app.db.mongo_repositories import (
                MongoAlertRepository,
                MongoAlertSubscriptionRepository,
                MongoNotificationHistoryRepository,
            )
            from app.providers.weather_provider import OpenWeatherMapProvider
            from app.services.alert_monitor import AlertMonitor
            from app.services.alert_service import AlertService
            from app.services.notification_service import NotificationService
            from app.services.websocket_manager import get_websocket_manager

            alert_repo = MongoAlertRepository(db=db)
            sub_repo = MongoAlertSubscriptionRepository(db=db)
            notif_hist_repo = MongoNotificationHistoryRepository(db=db)
            provider = OpenWeatherMapProvider(settings=settings)
            alert_service = AlertService(provider=provider, alert_repo=alert_repo, settings=settings)
            ws_mgr = get_websocket_manager()
            notif_service = NotificationService(ws_manager=ws_mgr, history_repo=notif_hist_repo)

            monitor = AlertMonitor(
                alert_service=alert_service,
                subscription_repo=sub_repo,
                notification_service=notif_service,
                settings=settings,
            )
            monitor.start()
            app.state.alert_monitor = monitor
            logger.info("AlertMonitor background task started successfully.")
        except Exception as exc:
            logger.error(f"Failed to start AlertMonitor on startup: {exc}")

    yield

    # Graceful shutdown: stop background monitoring task
    monitor = getattr(app.state, "alert_monitor", None)
    if monitor:
        await monitor.stop()

    # Close active WebSocket connections
    try:
        from app.services.websocket_manager import get_websocket_manager
        ws_mgr = get_websocket_manager()
        await ws_mgr.disconnect_all()
    except Exception as exc:
        logger.warning(f"Error closing WebSocket connections: {exc}")

    await close_mongo_db()
    logger.info(f"Shutting down {settings.PROJECT_NAME}")



app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "WeatherGPT is an AI-powered conversational weather intelligence platform API. "
        "Provides real-time normalized weather, hourly/daily forecasts, location geocoding, "
        "and context-grounded AI weather assistant endpoints."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# 1. Security Headers Middleware (Applies to all HTTP responses)
app.add_middleware(SecurityHeadersMiddleware)

# 2. Correlation ID Middleware (Ensures X-Request-ID propagation)
app.add_middleware(CorrelationIdMiddleware)

# 3. Rate Limiting Middleware (Protects sensitive endpoints from abuse)
app.add_middleware(RateLimiterMiddleware)

# 4. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    # The frontend uses bearer tokens rather than browser cookies. Starlette
    # rejects wildcard origins during credentialed preflight requests.
    allow_credentials="*" not in settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5. Custom Request Logging Middleware
app.add_middleware(RequestLoggingMiddleware)


# Global Exception Handlers
@app.exception_handler(AppException)
async def handle_app_exception(request: Request, exc: AppException) -> JSONResponse:
    """Standardized handler for domain exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Standardized handler for Pydantic input validation failures."""
    errors = exc.errors()
    formatted_errors = []
    for err in errors:
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "Invalid field")
        formatted_errors.append(f"{loc}: {msg}")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed.",
                "details": {"validation_errors": formatted_errors},
            }
        },
    )


@app.exception_handler(Exception)
async def handle_unhandled_exception(request: Request, exc: Exception) -> JSONResponse:
    """Fallback handler for unhandled server exceptions to prevent leaking internal traces."""
    logger.error(f"Unhandled Exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please try again later.",
                "details": {},
            }
        },
    )


# Include Root & Health Routers
app.include_router(health.router)

# Include API v1 Routers
app.include_router(api_router, prefix=settings.API_V1_STR)
