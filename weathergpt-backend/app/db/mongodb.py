"""
MongoDB async client initialization, lifecycle management, and index configuration.
Uses Motor (async Python driver for MongoDB).
"""

from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import pymongo
from app.core.config import get_settings
from app.core.logging import logger

settings = get_settings()

mongo_client: Optional[AsyncIOMotorClient] = None
mongo_db: Optional[AsyncIOMotorDatabase] = None


async def init_mongo_db() -> Optional[AsyncIOMotorDatabase]:
    """
    Initialize the asynchronous MongoDB client and configure indexes for all collections:
    - users
    - chat_history
    - locations (saved/favorite locations with geospatial indexing)
    - weather_history (weather query telemetry logs)
    """
    global mongo_client, mongo_db

    mongo_url = settings.effective_mongodb_url
    if not mongo_url or not mongo_url.strip():
        logger.info("MONGODB_URL is not set. MongoDB features will run with fallback or disabled.")
        return None

    try:
        mongo_client = AsyncIOMotorClient(
            mongo_url,
            serverSelectionTimeoutMS=5000,
        )
        mongo_db = mongo_client[settings.MONGODB_DB_NAME]

        # Ping server to verify connectivity
        await mongo_client.admin.command("ping")
        logger.info(f"MongoDB connected successfully to database: '{settings.MONGODB_DB_NAME}'")

        # Create indexes asynchronously
        await create_mongo_indexes(mongo_db)
        return mongo_db
    except Exception as exc:
        logger.warning(
            f"MongoDB connection could not be established: {exc}. "
            "Running with safe in-memory or degraded fallback."
        )
        mongo_client = None
        mongo_db = None
        return None


async def create_mongo_indexes(db: AsyncIOMotorDatabase) -> None:
    """Ensure indexes exist on MongoDB collections."""
    try:
        # 1. Users collection indexes
        await db.users.create_index([("email", pymongo.ASCENDING)], unique=True, sparse=True)
        await db.users.create_index([("username", pymongo.ASCENDING)], unique=True, sparse=True)
        await db.users.create_index([("created_at", pymongo.DESCENDING)])

        # 2. Chat history collection indexes
        await db.chat_history.create_index([("session_id", pymongo.ASCENDING)])
        await db.chat_history.create_index([("user_id", pymongo.ASCENDING)])
        await db.chat_history.create_index([("created_at", pymongo.DESCENDING)])

        # 3. Locations collection indexes (Favorites & Geospatial)
        await db.locations.create_index([("user_id", pymongo.ASCENDING)])
        await db.locations.create_index([("coordinates", pymongo.GEOSPHERE)])
        await db.locations.create_index([("user_id", pymongo.ASCENDING), ("name", pymongo.ASCENDING)])

        # 4. Weather history collection indexes
        await db.weather_history.create_index([("city", pymongo.ASCENDING)])
        await db.weather_history.create_index([("user_id", pymongo.ASCENDING)])
        await db.weather_history.create_index([("session_id", pymongo.ASCENDING)])
        await db.weather_history.create_index([("created_at", pymongo.DESCENDING)])

        # 5. Notifications collection indexes
        await db.notifications.create_index([("user_id", pymongo.ASCENDING)])
        await db.notifications.create_index([("is_read", pymongo.ASCENDING)])
        await db.notifications.create_index([("created_at", pymongo.DESCENDING)])

        # 6. Step 4: Alerts collection indexes
        await db.alerts.create_index([("alert_id", pymongo.ASCENDING)], unique=True, sparse=True)
        await db.alerts.create_index([("is_active", pymongo.ASCENDING)])
        await db.alerts.create_index([("location.name", pymongo.ASCENDING)])
        await db.alerts.create_index([("severity", pymongo.ASCENDING)])
        await db.alerts.create_index([("starts_at", pymongo.ASCENDING)])
        await db.alerts.create_index([("ends_at", pymongo.ASCENDING)])
        await db.alerts.create_index([("received_at", pymongo.DESCENDING)])

        # 7. Step 4: Alert Subscriptions collection indexes
        await db.alert_subscriptions.create_index([("user_id", pymongo.ASCENDING)])
        await db.alert_subscriptions.create_index([("location.city", pymongo.ASCENDING)])
        await db.alert_subscriptions.create_index([("enabled", pymongo.ASCENDING)])
        await db.alert_subscriptions.create_index([("created_at", pymongo.DESCENDING)])

        # 8. Step 4: Notification History collection indexes (Duplicate prevention & history)
        await db.notification_history.create_index(
            [("alert_id", pymongo.ASCENDING), ("user_id", pymongo.ASCENDING), ("type", pymongo.ASCENDING)]
        )
        await db.notification_history.create_index([("sent_at", pymongo.DESCENDING)])

        # 9. Step 6: Climate History collection indexes
        await db.climate_history.create_index([("location.name", pymongo.ASCENDING)])
        await db.climate_history.create_index([("date", pymongo.ASCENDING)])
        await db.climate_history.create_index(
            [("location.name", pymongo.ASCENDING), ("date", pymongo.ASCENDING)],
            unique=True,
            sparse=True,
        )
        await db.climate_history.create_index(
            [("location.lat", pymongo.ASCENDING), ("location.lon", pymongo.ASCENDING), ("date", pymongo.ASCENDING)]
        )

        # 10. Step 7: Official Warnings collection indexes
        await db.official_warnings.create_index([("alert_id", pymongo.ASCENDING)], unique=True, sparse=True)
        await db.official_warnings.create_index([("location.name", pymongo.ASCENDING)])
        await db.official_warnings.create_index([("severity", pymongo.ASCENDING)])
        await db.official_warnings.create_index([("issued_at", pymongo.DESCENDING)])
        await db.official_warnings.create_index([("valid_until", pymongo.ASCENDING)])
        await db.official_warnings.create_index([("is_active", pymongo.ASCENDING)])

        # 11. Step 7: Weather Forecasts cache collection indexes
        await db.weather_forecasts.create_index([("location.name", pymongo.ASCENDING)])
        await db.weather_forecasts.create_index([("forecast_time", pymongo.ASCENDING)])
        await db.weather_forecasts.create_index([("source", pymongo.ASCENDING)])

        # 12. Step 7: Weather Advisories collection indexes
        await db.weather_advisories.create_index([("location.name", pymongo.ASCENDING)])
        await db.weather_advisories.create_index([("risk_type", pymongo.ASCENDING)])
        await db.weather_advisories.create_index([("severity", pymongo.ASCENDING)])
        await db.weather_advisories.create_index([("created_at", pymongo.DESCENDING)])

        # 13. Step 7: Provider Status monitoring collection indexes
        await db.provider_status.create_index([("provider_name", pymongo.ASCENDING)])
        await db.provider_status.create_index([("last_checked", pymongo.DESCENDING)])

        logger.info("MongoDB indexes verified/created successfully.")
    except Exception as exc:
        logger.warning(f"Could not create MongoDB indexes: {exc}")


async def close_mongo_db() -> None:
    """Close MongoDB client connection pool."""
    global mongo_client, mongo_db
    if mongo_client is not None:
        mongo_client.close()
        logger.info("MongoDB client connection closed.")
        mongo_client = None
        mongo_db = None


def get_mongo_database() -> Optional[AsyncIOMotorDatabase]:
    """Dependency provider for the MongoDB database instance."""
    return mongo_db
