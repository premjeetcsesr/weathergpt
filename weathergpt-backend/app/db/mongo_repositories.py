"""
Asynchronous MongoDB Repositories using Motor:
- MongoUserRepository
- MongoChatHistoryRepository
- MongoLocationRepository
- MongoWeatherHistoryRepository
"""

import math
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from bson import ObjectId
import pymongo
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.logging import logger
from app.core.security import hash_password


def serialize_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Helper to convert MongoDB _id ObjectId to string id."""
    if not doc:
        return None
    doc_copy = dict(doc)
    if "_id" in doc_copy:
        doc_copy["id"] = str(doc_copy.pop("_id"))
    return doc_copy


class MongoUserRepository:
    """Repository for User Management and Authentication in MongoDB."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db
        self.collection = db.users if db is not None else None

    async def create_user(
        self,
        email: str,
        username: str,
        plain_password: str,
        full_name: Optional[str] = None,
        role: str = "user",
        preferences: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        if self.collection is None:
            return None

        now = datetime.now(timezone.utc)
        user_doc = {
            "email": email.lower().strip(),
            "username": username.lower().strip(),
            "hashed_password": hash_password(plain_password),
            "full_name": full_name.strip() if full_name else None,
            "role": (role or "user").lower().strip(),
            "is_active": True,
            "preferences": preferences or {
                "unit": "celsius",
                "theme": "dark",
                "language": "en",
                "default_city": "Kanpur",
            },
            "created_at": now,
            "updated_at": now,
        }

        result = await self.collection.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        return serialize_doc(user_doc)

    async def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        if self.collection is None or not user_id:
            return None
        try:
            oid = ObjectId(user_id) if isinstance(user_id, str) and ObjectId.is_valid(user_id) else user_id
            doc = await self.collection.find_one({"_id": oid})
            return serialize_doc(doc)
        except Exception as exc:
            logger.error(f"Error fetching user by id {user_id}: {exc}")
            return None

    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        if self.collection is None or not email:
            return None
        doc = await self.collection.find_one({"email": email.lower().strip()})
        return serialize_doc(doc)

    async def get_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        if self.collection is None or not username:
            return None
        doc = await self.collection.find_one({"username": username.lower().strip()})
        return serialize_doc(doc)

    async def get_by_email_or_username(self, identifier: str) -> Optional[Dict[str, Any]]:
        if self.collection is None or not identifier:
            return None
        clean_id = identifier.lower().strip()
        doc = await self.collection.find_one({
            "$or": [
                {"email": clean_id},
                {"username": clean_id},
            ]
        })
        return serialize_doc(doc)

    async def update_preferences(
        self,
        user_id: str,
        preferences: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        if self.collection is None or not user_id:
            return None
        try:
            oid = ObjectId(user_id) if isinstance(user_id, str) and ObjectId.is_valid(user_id) else user_id
            update_fields = {}
            for k, v in preferences.items():
                if v is not None:
                    update_fields[f"preferences.{k}"] = v
            update_fields["updated_at"] = datetime.now(timezone.utc)

            await self.collection.update_one(
                {"_id": oid},
                {"$set": update_fields},
            )
            return await self.get_by_id(user_id)
        except Exception as exc:
            logger.error(f"Error updating user preferences for {user_id}: {exc}")
            return None

    async def update_language_preference(self, user_id: str, language: str) -> bool:
        if self.collection is None or not user_id:
            return False
        try:
            oid = ObjectId(user_id) if isinstance(user_id, str) and ObjectId.is_valid(user_id) else user_id
            await self.collection.update_one(
                {"_id": oid},
                {
                    "$set": {
                        "preferred_language": language,
                        "preferences.language": language,
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )
            return True
        except Exception as exc:
            logger.error(f"Error updating language preference for {user_id}: {exc}")
            return False

    async def get_language_preference(self, user_id: str) -> str:
        user = await self.get_by_id(user_id)
        if not user:
            return "en"
        return user.get("preferred_language") or user.get("preferences", {}).get("language", "en")


class MongoChatHistoryRepository:
    """Repository for Conversational Weather History in MongoDB."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db
        self.collection = db.chat_history if db is not None else None

    async def log_chat_turn(
        self,
        message: str,
        response: str,
        location: str,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        intent: Optional[str] = None,
        language: Optional[str] = "en",
        weather_context: Optional[Dict[str, Any]] = None,
        input_mode: Optional[str] = "text",
    ) -> Optional[Dict[str, Any]]:
        if self.collection is None:
            return None

        now = datetime.now(timezone.utc)
        doc = {
            "session_id": session_id,
            "user_id": user_id,
            "message": message,
            "response": response,
            "location": location,
            "intent": intent,
            "language": language,
            "input_mode": input_mode or "text",
            "weather_context": weather_context,
            "created_at": now,
        }

        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_doc(doc)

    async def get_session_history(
        self,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[Dict[str, Any]]:
        if self.collection is None:
            return []

        query: Dict[str, Any] = {}
        if session_id:
            query["session_id"] = session_id
        if user_id:
            query["user_id"] = user_id

        if not query:
            return []

        cursor = (
            self.collection.find(query)
            .sort("created_at", 1)  # Chronological order
            .skip(skip)
            .limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(d) for d in docs if d]

    async def get_user_sessions(self, user_id: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        if self.collection is None:
            return []

        match_stage = {"user_id": user_id} if user_id else {"session_id": {"$ne": None}}
        pipeline = [
            {"$match": match_stage},
            {"$sort": {"created_at": -1}},
            {
                "$group": {
                    "_id": "$session_id",
                    "message_count": {"$sum": 1},
                    "last_message": {"$first": "$message"},
                    "last_location": {"$first": "$location"},
                    "last_updated": {"$first": "$created_at"},
                }
            },
            {"$sort": {"last_updated": -1}},
            {"$limit": limit},
        ]

        cursor = self.collection.aggregate(pipeline)
        docs = await cursor.to_list(length=limit)
        return [
            {
                "session_id": d["_id"] or "default",
                "message_count": d.get("message_count", 0),
                "last_message": d.get("last_message", ""),
                "last_location": d.get("last_location", ""),
                "last_updated": d.get("last_updated", datetime.now(timezone.utc)),
            }
            for d in docs
        ]

    async def delete_session_history(
        self,
        session_id: str,
        user_id: Optional[str] = None,
    ) -> int:
        if self.collection is None or not session_id:
            return 0
        query: Dict[str, Any] = {"session_id": session_id}
        if user_id:
            query["user_id"] = user_id
        res = await self.collection.delete_many(query)
        return res.deleted_count

    async def clear_user_history(self, user_id: str) -> int:
        if self.collection is None or not user_id:
            return 0
        res = await self.collection.delete_many({"user_id": user_id})
        return res.deleted_count


class MongoLocationRepository:
    """Repository for Saved & Favorite Locations in MongoDB."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db
        self.collection = db.locations if db is not None else None

    async def add_saved_location(
        self,
        name: str,
        latitude: float,
        longitude: float,
        state: Optional[str] = None,
        country: Optional[str] = "India",
        tag: Optional[str] = "Favorite",
        user_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        if self.collection is None:
            return None

        now = datetime.now(timezone.utc)
        doc = {
            "name": name.strip(),
            "latitude": float(latitude),
            "longitude": float(longitude),
            "state": state.strip() if state else None,
            "country": country.strip() if country else "India",
            "tag": tag.strip() if tag else "Favorite",
            "user_id": user_id,
            "coordinates": {
                "type": "Point",
                "coordinates": [float(longitude), float(latitude)],
            },
            "created_at": now,
        }

        # Check if already saved for this user
        existing = await self.collection.find_one({
            "user_id": user_id,
            "name": {"$regex": f"^{name.strip()}$", "$options": "i"},
        })
        if existing:
            return serialize_doc(existing)

        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_doc(doc)

    async def get_saved_locations(
        self,
        user_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        if self.collection is None:
            return []

        query = {"user_id": user_id} if user_id else {}
        cursor = self.collection.find(query).sort("created_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(d) for d in docs if d]

    async def delete_saved_location(
        self,
        location_id: str,
        user_id: Optional[str] = None,
    ) -> bool:
        if self.collection is None or not location_id:
            return False
        try:
            oid = ObjectId(location_id) if ObjectId.is_valid(location_id) else location_id
            query: Dict[str, Any] = {"_id": oid}
            if user_id:
                query["user_id"] = user_id
            res = await self.collection.delete_one(query)
            return res.deleted_count > 0
        except Exception as exc:
            logger.error(f"Error deleting saved location {location_id}: {exc}")
            return False


class MongoWeatherHistoryRepository:
    """Repository for Weather Search Logs and Telemetry Snapshots in MongoDB."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db
        self.collection = db.weather_history if db is not None else None

    async def log_weather_query(
        self,
        query: str,
        city: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        temperature: Optional[float] = None,
        feels_like: Optional[float] = None,
        condition: Optional[str] = None,
        humidity: Optional[int] = None,
        wind_speed: Optional[float] = None,
        source: Optional[str] = "openweathermap",
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        if self.collection is None:
            return None

        now = datetime.now(timezone.utc)
        doc = {
            "query": query.strip(),
            "city": city.strip(),
            "latitude": latitude,
            "longitude": longitude,
            "temperature": temperature,
            "feels_like": feels_like,
            "condition": condition,
            "humidity": humidity,
            "wind_speed": wind_speed,
            "source": source,
            "user_id": user_id,
            "session_id": session_id,
            "created_at": now,
        }

        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_doc(doc)

    async def get_history(
        self,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        limit: int = 20,
        skip: int = 0,
    ) -> List[Dict[str, Any]]:
        if self.collection is None:
            return []

        query: Dict[str, Any] = {}
        if user_id:
            query["user_id"] = user_id
        elif session_id:
            query["session_id"] = session_id

        cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(d) for d in docs if d]

    async def get_popular_cities(self, limit: int = 6) -> List[Dict[str, Any]]:
        if self.collection is None:
            return []

        pipeline = [
            {
                "$group": {
                    "_id": "$city",
                    "search_count": {"$sum": 1},
                    "last_searched": {"$max": "$created_at"},
                }
            },
            {"$sort": {"search_count": -1, "last_searched": -1}},
            {"$limit": limit},
        ]

        cursor = self.collection.aggregate(pipeline)
        docs = await cursor.to_list(length=limit)
        return [
            {
                "city": d["_id"],
                "search_count": d.get("search_count", 0),
                "last_searched": d.get("last_searched", datetime.now(timezone.utc)),
            }
            for d in docs
            if d.get("_id")
        ]

    async def clear_history(
        self,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> int:
        if self.collection is None:
            return 0
        query: Dict[str, Any] = {}
        if user_id:
            query["user_id"] = user_id
        elif session_id:
            query["session_id"] = session_id
        else:
            return 0

        res = await self.collection.delete_many(query)
        return res.deleted_count


class MongoNotificationRepository:
    """Repository for Weather Alerts & User Notifications in MongoDB."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db
        self.collection = db.notifications if db is not None else None

    async def create_notification(
        self,
        title: str,
        message: str,
        type: str = "alert",
        severity: str = "medium",
        location: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        if self.collection is None:
            return None

        now = datetime.now(timezone.utc)
        doc = {
            "title": title.strip(),
            "message": message.strip(),
            "type": type.strip().lower(),
            "severity": severity.strip().lower(),
            "location": location.strip() if location else None,
            "user_id": user_id,
            "is_read": False,
            "created_at": now,
        }

        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_doc(doc)

    async def get_user_notifications(
        self,
        user_id: Optional[str] = None,
        unread_only: bool = False,
        limit: int = 30,
        skip: int = 0,
    ) -> List[Dict[str, Any]]:
        if self.collection is None:
            return []

        # Find user-specific notifications OR global broadcast notifications (user_id=None)
        if user_id:
            query: Dict[str, Any] = {"$or": [{"user_id": user_id}, {"user_id": None}]}
        else:
            query = {"user_id": None}

        if unread_only:
            query["is_read"] = False

        cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(d) for d in docs if d]

    async def get_unread_count(self, user_id: Optional[str] = None) -> int:
        if self.collection is None:
            return 0

        if user_id:
            query: Dict[str, Any] = {
                "$or": [{"user_id": user_id}, {"user_id": None}],
                "is_read": False,
            }
        else:
            query = {"user_id": None, "is_read": False}

        count = await self.collection.count_documents(query)
        return count

    async def mark_as_read(
        self,
        notification_id: str,
        user_id: Optional[str] = None,
    ) -> bool:
        if self.collection is None or not notification_id:
            return False
        try:
            oid = ObjectId(notification_id) if ObjectId.is_valid(notification_id) else notification_id
            query: Dict[str, Any] = {"_id": oid}
            if user_id:
                query["$or"] = [{"user_id": user_id}, {"user_id": None}]

            res = await self.collection.update_one(query, {"$set": {"is_read": True}})
            return res.modified_count > 0 or res.matched_count > 0
        except Exception as exc:
            logger.error(f"Error marking notification {notification_id} as read: {exc}")
            return False

    async def mark_all_read(self, user_id: Optional[str] = None) -> int:
        if self.collection is None:
            return 0

        if user_id:
            query: Dict[str, Any] = {
                "$or": [{"user_id": user_id}, {"user_id": None}],
                "is_read": False,
            }
        else:
            query = {"user_id": None, "is_read": False}

        res = await self.collection.update_many(query, {"$set": {"is_read": True}})
        return res.modified_count

    async def delete_notification(
        self,
        notification_id: str,
        user_id: Optional[str] = None,
    ) -> bool:
        if self.collection is None or not notification_id:
            return False
        try:
            oid = ObjectId(notification_id) if ObjectId.is_valid(notification_id) else notification_id
            query: Dict[str, Any] = {"_id": oid}
            if user_id:
                query["user_id"] = user_id

            res = await self.collection.delete_one(query)
            return res.deleted_count > 0
        except Exception as exc:
            logger.error(f"Error deleting notification {notification_id}: {exc}")
            return False


class MongoAlertRepository:
    """Repository for meteorological emergency warnings and active alerts in MongoDB."""

    SEVERITY_ORDER = {"minor": 1, "moderate": 2, "severe": 3, "extreme": 4}

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db
        self.collection = db.alerts if db is not None else None

    async def save_or_update_alert(self, alert_data: Dict[str, Any]) -> tuple[Optional[Dict[str, Any]], bool, bool]:
        """
        Save new alert or update existing alert in MongoDB.
        Returns: (serialized_document, is_new, is_updated)
        """
        if self.collection is None:
            return None, False, False

        alert_id = alert_data.get("alert_id")
        if not alert_id:
            return None, False, False

        now = datetime.now(timezone.utc).isoformat()
        existing = await self.collection.find_one({"alert_id": alert_id})

        if not existing:
            doc = dict(alert_data)
            doc["received_at"] = doc.get("received_at") or now
            doc["updated_at"] = doc.get("updated_at") or now
            doc["is_active"] = doc.get("is_active", True)
            result = await self.collection.insert_one(doc)
            doc["_id"] = result.inserted_id
            return serialize_doc(doc), True, False

        # Compare meaningful fields to detect updates
        meaningful_fields = ["severity", "urgency", "headline", "description", "instruction", "ends_at", "is_active"]
        is_changed = any(
            str(alert_data.get(field, "")).strip() != str(existing.get(field, "")).strip()
            for field in meaningful_fields
            if field in alert_data
        )

        update_payload = dict(alert_data)
        update_payload["updated_at"] = now

        await self.collection.update_one({"_id": existing["_id"]}, {"$set": update_payload})
        updated_doc = await self.collection.find_one({"_id": existing["_id"]})
        return serialize_doc(updated_doc), False, is_changed

    async def get_active_alerts(
        self,
        city: Optional[str] = None,
        severity: Optional[str] = None,
        active_only: bool = True,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Fetch active meteorological alerts matching query criteria."""
        if self.collection is None:
            return []

        query: Dict[str, Any] = {}
        if active_only:
            query["is_active"] = True

        if city:
            query["$or"] = [
                {"location.name": {"$regex": f"^{city.strip()}$", "$options": "i"}},
                {"location.name": {"$regex": city.strip(), "$options": "i"}},
            ]

        if severity:
            query["severity"] = severity.lower().strip()

        cursor = self.collection.find(query).sort("received_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(d) for d in docs if d]

    async def get_alert_by_id(self, alert_id: str) -> Optional[Dict[str, Any]]:
        """Fetch single alert by alert_id or mongo _id."""
        if self.collection is None or not alert_id:
            return None

        query: Dict[str, Any] = {"alert_id": alert_id}
        if ObjectId.is_valid(alert_id):
            query = {"$or": [{"alert_id": alert_id}, {"_id": ObjectId(alert_id)}]}

        doc = await self.collection.find_one(query)
        return serialize_doc(doc)

    async def get_alert_history(
        self,
        city: Optional[str] = None,
        date_from: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[Dict[str, Any]]:
        """Fetch historical alert records with optional filters."""
        if self.collection is None:
            return []

        query: Dict[str, Any] = {}
        if city:
            query["location.name"] = {"$regex": city.strip(), "$options": "i"}

        if severity:
            query["severity"] = severity.lower().strip()

        if date_from:
            query["received_at"] = {"$gte": date_from}

        cursor = self.collection.find(query).sort("received_at", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(d) for d in docs if d]

    async def expire_alerts(self, cutoff_time: Optional[datetime] = None) -> List[str]:
        """Mark alerts expired whose ends_at is before current time."""
        if self.collection is None:
            return []

        now_iso = (cutoff_time or datetime.now(timezone.utc)).isoformat()
        cursor = self.collection.find({
            "is_active": True,
            "ends_at": {"$lt": now_iso, "$ne": None},
        })
        expired_docs = await cursor.to_list(length=100)
        expired_ids = []

        for doc in expired_docs:
            await self.collection.update_one(
                {"_id": doc["_id"]},
                {"$set": {"is_active": False, "updated_at": now_iso}},
            )
            expired_ids.append(str(doc.get("alert_id") or doc["_id"]))

        return expired_ids


class MongoAlertSubscriptionRepository:
    """Repository for user location alert subscriptions in MongoDB."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db
        self.collection = db.alert_subscriptions if db is not None else None

    async def create_subscription(
        self,
        city: str,
        user_id: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        severity_threshold: str = "moderate",
    ) -> Optional[Dict[str, Any]]:
        """Create or reactivate an alert subscription for a location."""
        if self.collection is None:
            return None

        now = datetime.now(timezone.utc).isoformat()
        clean_city = city.strip()
        threshold = severity_threshold.lower().strip()

        # Check existing subscription for user + city
        existing = await self.collection.find_one({
            "user_id": user_id,
            "location.city": {"$regex": f"^{clean_city}$", "$options": "i"},
        })

        if existing:
            await self.collection.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "enabled": True,
                        "severity_threshold": threshold,
                        "updated_at": now,
                        "location.latitude": latitude or existing.get("location", {}).get("latitude"),
                        "location.longitude": longitude or existing.get("location", {}).get("longitude"),
                    }
                },
            )
            updated = await self.collection.find_one({"_id": existing["_id"]})
            return serialize_doc(updated)

        doc = {
            "user_id": user_id,
            "location": {
                "city": clean_city,
                "latitude": latitude,
                "longitude": longitude,
            },
            "severity_threshold": threshold,
            "enabled": True,
            "created_at": now,
            "updated_at": now,
        }

        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_doc(doc)

    async def get_subscriptions(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch subscriptions for user or all enabled subscriptions."""
        if self.collection is None:
            return []

        query = {"user_id": user_id} if user_id else {"enabled": True}
        cursor = self.collection.find(query).sort("created_at", -1)
        docs = await cursor.to_list(length=100)
        return [serialize_doc(d) for d in docs if d]

    async def get_subscribers_for_location(
        self,
        city: str,
        severity: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Find all enabled subscriptions that match target city and severity threshold."""
        if self.collection is None:
            return []

        cursor = self.collection.find({
            "enabled": True,
            "location.city": {"$regex": f"^{city.strip()}$", "$options": "i"},
        })
        docs = await cursor.to_list(length=200)

        severity_rank = MongoAlertRepository.SEVERITY_ORDER
        current_sev_val = severity_rank.get((severity or "minor").lower(), 1)

        qualifying = []
        for doc in docs:
            thresh_val = severity_rank.get(doc.get("severity_threshold", "moderate").lower(), 2)
            if current_sev_val >= thresh_val:
                qualifying.append(serialize_doc(doc))

        return qualifying

    async def delete_subscription(
        self,
        subscription_id: str,
        user_id: Optional[str] = None,
    ) -> bool:
        """Delete or disable alert subscription."""
        if self.collection is None or not subscription_id:
            return False

        try:
            oid = ObjectId(subscription_id) if ObjectId.is_valid(subscription_id) else subscription_id
            query: Dict[str, Any] = {"_id": oid}
            if user_id:
                query["user_id"] = user_id

            res = await self.collection.delete_one(query)
            return res.deleted_count > 0
        except Exception as exc:
            logger.error(f"Error deleting subscription {subscription_id}: {exc}")
            return False


class MongoNotificationHistoryRepository:
    """Repository for managing alert notification history and duplicate prevention."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db
        self.collection = db.notification_history if db is not None else None

    async def has_notification_been_sent(
        self,
        alert_id: str,
        user_id: Optional[str],
        notification_type: str = "weather_alert",
        content_hash: Optional[str] = None,
    ) -> bool:
        """Check if notification has already been sent using alert_id + user_id + type (+ hash)."""
        if self.collection is None or not alert_id:
            return False

        query: Dict[str, Any] = {
            "alert_id": alert_id,
            "user_id": user_id,
            "type": notification_type,
        }
        if content_hash:
            query["content_hash"] = content_hash

        doc = await self.collection.find_one(query)
        return doc is not None

    async def record_notification(
        self,
        alert_id: str,
        user_id: Optional[str] = None,
        notification_type: str = "weather_alert",
        channel: str = "websocket",
        status: str = "sent",
        content_hash: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Record a sent notification in notification_history."""
        if self.collection is None:
            return None

        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "alert_id": alert_id,
            "user_id": user_id,
            "type": notification_type,
            "channel": channel,
            "sent_at": now,
            "status": status,
            "content_hash": content_hash,
        }

        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_doc(doc)

    async def get_history(
        self,
        user_id: Optional[str] = None,
        alert_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Get notification dispatch records."""
        if self.collection is None:
            return []

        query: Dict[str, Any] = {}
        if user_id:
            query["user_id"] = user_id
        if alert_id:
            query["alert_id"] = alert_id

        cursor = self.collection.find(query).sort("sent_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(d) for d in docs if d]


class MongoClimateRepository:
    """Repository for Historical Climate Telemetry in MongoDB (climate_history)."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db
        self.collection = db.climate_history if db is not None else None

    async def upsert_record(self, record: Dict[str, Any]) -> bool:
        """Upsert a single daily historical weather record."""
        if self.collection is None or not record:
            return False
        try:
            city_name = record.get("location", {}).get("name", "Unknown").strip()
            date_str = record.get("date")
            if not date_str:
                return False

            now_iso = datetime.now(timezone.utc).isoformat()
            record["updated_at"] = now_iso
            if "created_at" not in record:
                record["created_at"] = now_iso

            await self.collection.update_one(
                {"location.name": city_name, "date": date_str},
                {"$set": record},
                upsert=True,
            )
            return True
        except Exception as exc:
            logger.error(f"Error upserting climate record: {exc}")
            return False

    async def upsert_batch(self, records: List[Dict[str, Any]]) -> int:
        """Upsert multiple historical records."""
        if self.collection is None or not records:
            return 0
        success_count = 0
        for rec in records:
            if await self.upsert_record(rec):
                success_count += 1
        return success_count

    async def get_records(
        self,
        city: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """Query historical daily records for a location within a date range."""
        if self.collection is None or not city:
            return []

        clean_city = city.strip()
        query: Dict[str, Any] = {
            "location.name": {"$regex": f"^{re.escape(clean_city)}$", "$options": "i"}
        }

        date_filter: Dict[str, Any] = {}
        if start_date:
            date_filter["$gte"] = start_date
        if end_date:
            date_filter["$lte"] = end_date
        if date_filter:
            query["date"] = date_filter

        cursor = self.collection.find(query).sort("date", 1)
        docs = await cursor.to_list(length=1000)
        return [serialize_doc(d) for d in docs if d]

    async def count_records(self, city: Optional[str] = None) -> int:
        """Count available historical records."""
        if self.collection is None:
            return 0
        query = {}
        if city:
            query["location.name"] = {"$regex": f"^{re.escape(city.strip())}$", "$options": "i"}
        return await self.collection.count_documents(query)

    async def get_baseline_statistics(self, city: str) -> Dict[str, Any]:
        """
        Calculate historical mean and standard deviation for temperature,
        rainfall, and humidity across all available records for the location.
        """
        if self.collection is None:
            return {}

        try:
            pipeline = [
                {"$match": {"location.name": {"$regex": f"^{re.escape(city.strip())}$", "$options": "i"}}},
                {
                    "$group": {
                        "_id": "$location.name",
                        "count": {"$sum": 1},
                        "avg_temp_mean": {"$avg": "$temperature.avg"},
                        "temp_std": {"$stdDevPop": "$temperature.avg"},
                        "rainfall_mean": {"$avg": "$rainfall"},
                        "rainfall_std": {"$stdDevPop": "$rainfall"},
                        "humidity_mean": {"$avg": "$humidity"},
                        "humidity_std": {"$stdDevPop": "$humidity"},
                    }
                },
            ]
            cursor = self.collection.aggregate(pipeline)
            docs = await cursor.to_list(length=1)
            if docs and docs[0].get("count", 0) > 0:
                d = docs[0]
                return {
                    "count": d.get("count", 0),
                    "temp_mean": round(d.get("avg_temp_mean") or 0.0, 2),
                    "temp_std": round(d.get("temp_std") or 2.5, 2),
                    "rainfall_mean": round(d.get("rainfall_mean") or 0.0, 2),
                    "rainfall_std": round(d.get("rainfall_std") or 5.0, 2),
                    "humidity_mean": round(d.get("humidity_mean") or 50.0, 2),
                    "humidity_std": round(d.get("humidity_std") or 10.0, 2),
                }
        except Exception:
            pass

        # Resilient fallback across mock or custom engines
        records = await self.get_records(city=city)
        if not records:
            return {}

        temps = [r["temperature"]["avg"] for r in records if "temperature" in r and "avg" in r["temperature"]]
        rains = [r.get("rainfall", 0.0) for r in records]
        hums = [r.get("humidity", 50.0) for r in records if "humidity" in r]

        def mean_std(vals: List[float], default_std: float = 2.0) -> Tuple[float, float]:
            if not vals:
                return 0.0, default_std
            m = sum(vals) / len(vals)
            var = sum((x - m) ** 2 for x in vals) / len(vals)
            s = math.sqrt(var)
            return round(m, 2), round(s if s > 0 else default_std, 2)

        t_m, t_s = mean_std(temps, 2.5)
        r_m, r_s = mean_std(rains, 5.0)
        h_m, h_s = mean_std(hums, 10.0)

        return {
            "count": len(records),
            "temp_mean": t_m,
            "temp_std": t_s,
            "rainfall_mean": r_m,
            "rainfall_std": r_s,
            "humidity_mean": h_m,
            "humidity_std": h_s,
        }


# ===========================================================================
# 10. Step 7: MongoOfficialWarningRepository
# ===========================================================================

class MongoOfficialWarningRepository:
    """Repository for official meteorological warnings, severity tiers, and deduplication."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db
        self.collection = db.official_warnings if db is not None else None

    async def upsert_warning(self, warning_data: Dict[str, Any]) -> Dict[str, Any]:
        if self.collection is None:
            return warning_data

        alert_id = warning_data.get("alert_id")
        now = datetime.now(timezone.utc).isoformat()
        warning_data.setdefault("updated_at", now)

        await self.collection.update_one(
            {"alert_id": alert_id},
            {"$set": warning_data},
            upsert=True,
        )
        doc = await self.collection.find_one({"alert_id": alert_id})
        return serialize_doc(doc) if doc else warning_data

    async def get_active_warnings(
        self,
        city: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        if self.collection is None:
            return []

        query: Dict[str, Any] = {"is_active": True}
        if city:
            query["location.name"] = {"$regex": f"^{city.strip()}$", "$options": "i"}
        if severity:
            query["severity"] = severity.lower().strip()

        # Check validity end if present
        now_iso = datetime.now(timezone.utc).isoformat()
        query["$or"] = [
            {"valid_until": None},
            {"valid_until": {"$gte": now_iso}},
        ]

        cursor = self.collection.find(query).sort("issued_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(d) for d in docs if d]

    async def mark_expired(self, alert_id: str) -> bool:
        if self.collection is None:
            return False
        res = await self.collection.update_one(
            {"alert_id": alert_id},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        return res.modified_count > 0


# ===========================================================================
# 11. Step 7: MongoAdvisoryRepository
# ===========================================================================

class MongoAdvisoryRepository:
    """Repository for weather-based actionable safety advisories."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db
        self.collection = db.weather_advisories if db is not None else None

    async def log_advisory(self, advisory: Dict[str, Any]) -> Dict[str, Any]:
        if self.collection is None:
            return advisory
        doc = dict(advisory)
        doc.setdefault("created_at", datetime.now(timezone.utc).isoformat())
        res = await self.collection.insert_one(doc)
        doc["_id"] = res.inserted_id
        return serialize_doc(doc)

    async def get_recent_advisories(
        self,
        city: str,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        if self.collection is None:
            return []
        cursor = self.collection.find(
            {"location.name": {"$regex": f"^{city.strip()}$", "$options": "i"}}
        ).sort("created_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(d) for d in docs if d]


# ===========================================================================
# 12. Step 7: MongoProviderStatusRepository
# ===========================================================================

class MongoProviderStatusRepository:
    """Repository for tracking provider connectivity, response latency, and status."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db
        self.collection = db.provider_status if db is not None else None

    async def record_status(
        self,
        provider_name: str,
        status: str,
        latency_ms: Optional[float] = None,
        last_error: Optional[str] = None,
    ) -> None:
        if self.collection is None:
            return

        now = datetime.now(timezone.utc).isoformat()
        await self.collection.update_one(
            {"provider_name": provider_name},
            {
                "$set": {
                    "status": status,
                    "latency_ms": latency_ms,
                    "last_error": last_error,
                    "last_checked": now,
                }
            },
            upsert=True,
        )

    async def get_all_statuses(self) -> List[Dict[str, Any]]:
        if self.collection is None:
            return []
        cursor = self.collection.find({}).sort("last_checked", -1)
        docs = await cursor.to_list(length=20)
        return [serialize_doc(d) for d in docs if d]


# ===========================================================================
# 13. Community Weather Reports Repository
# ===========================================================================

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in kilometers between two GPS coordinate points."""
    import math
    R = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


def to_oid(val: Any) -> Any:
    """Convert string to ObjectId if valid, else return as is."""
    if isinstance(val, str) and ObjectId.is_valid(val):
        return ObjectId(val)
    return val


class MongoCommunityReportRepository:
    """Repository for Community Weather Reports with GeoJSON support and moderation workflow."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db
        self.collection = db.community_reports if db is not None else None

    async def create_report(self, report_data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a newly created community report."""
        if self.collection is None:
            doc = dict(report_data)
            doc["id"] = "mock_report_" + str(datetime.now(timezone.utc).timestamp())
            return doc

        doc = dict(report_data)
        now = datetime.now(timezone.utc)
        if "created_at" not in doc:
            doc["created_at"] = now
        if "reported_at" not in doc:
            doc["reported_at"] = now
        if "updated_at" not in doc:
            doc["updated_at"] = now
        if "status" not in doc:
            doc["status"] = "PENDING"

        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_doc(doc)

    async def get_by_id(self, report_id: str) -> Optional[Dict[str, Any]]:
        """Find a report by its MongoDB ObjectId or string id."""
        if self.collection is None:
            return None

        oid = to_oid(report_id)
        query = {"_id": oid}
        doc = await self.collection.find_one(query)
        return serialize_doc(doc) if doc else None

    async def list_reports(
        self,
        category: Optional[str] = None,
        status: Optional[str] = None,
        start_time: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Fetch filtered community reports with total count."""
        if self.collection is None:
            return [], 0

        query: Dict[str, Any] = {}
        if category:
            query["category"] = category.lower().strip()
        if status:
            query["status"] = status.upper().strip()
        if start_time:
            query["reported_at"] = {"$gte": start_time}

        total = await self.collection.count_documents(query)
        cursor = self.collection.find(query).sort("reported_at", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(d) for d in docs if d], total

    async def get_nearby_reports(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 25.0,
        category: Optional[str] = None,
        status: Optional[str] = "VERIFIED",
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Query nearby reports using geospatial indexing with Haversine distance fallback."""
        if self.collection is None:
            return []

        base_query: Dict[str, Any] = {}
        if status:
            base_query["status"] = status.upper().strip()
        if category:
            base_query["category"] = category.lower().strip()

        # Try MongoDB 2dsphere nearSphere query first
        reports = []
        try:
            geo_query = dict(base_query)
            geo_query["location"] = {
                "$nearSphere": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": [longitude, latitude],
                    },
                    "$maxDistance": radius_km * 1000,  # meters
                }
            }
            cursor = self.collection.find(geo_query).limit(limit)
            docs = await cursor.to_list(length=limit)
            for d in docs:
                s = serialize_doc(d)
                coords = s.get("location", {}).get("coordinates", [0, 0])
                if len(coords) >= 2:
                    dist = haversine_distance_km(latitude, longitude, coords[1], coords[0])
                    s["distance_km"] = dist
                reports.append(s)
            return reports
        except Exception:
            # Fallback for environments / mock clients without 2dsphere indexing support
            pass

        cursor = self.collection.find(base_query).sort("reported_at", -1).limit(limit * 2)
        docs = await cursor.to_list(length=limit * 2)
        filtered = []
        for d in docs:
            s = serialize_doc(d)
            coords = s.get("location", {}).get("coordinates", [0, 0])
            if len(coords) >= 2:
                dist = haversine_distance_km(latitude, longitude, coords[1], coords[0])
                if dist <= radius_km:
                    s["distance_km"] = dist
                    filtered.append(s)
        filtered.sort(key=lambda x: x.get("distance_km", 9999))
        return filtered[:limit]

    async def get_user_reports(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch all reports submitted by a specific user across all statuses."""
        if self.collection is None:
            return []

        cursor = self.collection.find({"user_id": str(user_id)}).sort("reported_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(d) for d in docs if d]

    async def update_status(
        self,
        report_id: str,
        status: str,
        verified_by: Optional[str] = None,
        rejection_reason: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Update report moderation status (VERIFIED or REJECTED)."""
        if self.collection is None:
            return None

        oid = to_oid(report_id)
        query = {"_id": oid}

        now = datetime.now(timezone.utc)
        update_fields: Dict[str, Any] = {
            "status": status.upper().strip(),
            "updated_at": now,
        }

        if status.upper() == "VERIFIED":
            update_fields["verified_at"] = now
            update_fields["verified_by"] = verified_by
            update_fields["rejection_reason"] = None
        elif status.upper() == "REJECTED":
            update_fields["rejection_reason"] = rejection_reason
            update_fields["verified_at"] = None
            update_fields["verified_by"] = verified_by

        result = await self.collection.find_one_and_update(
            query,
            {"$set": update_fields},
            return_document=pymongo.ReturnDocument.AFTER,
        )
        return serialize_doc(result) if result else None

    async def delete_report(self, report_id: str) -> bool:
        """Delete a community report by ID."""
        if self.collection is None:
            return False

        oid = to_oid(report_id)
        query = {"_id": oid}
        result = await self.collection.delete_one(query)
        return result.deleted_count > 0

    async def check_recent_duplicate(
        self,
        user_id: str,
        category: str,
        description: str,
        window_seconds: int = 120,
    ) -> bool:
        """Prevent duplicate submissions within a short time window."""
        if self.collection is None:
            return False

        cutoff = datetime.now(timezone.utc) - timedelta(seconds=window_seconds)
        doc = await self.collection.find_one(
            {
                "user_id": str(user_id),
                "category": category.lower().strip(),
                "description": description.strip(),
                "created_at": {"$gte": cutoff},
            }
        )
        return doc is not None

    async def count_user_recent_reports(self, user_id: str, window_seconds: int = 600) -> int:
        """Count reports submitted by user within window (rate limiting)."""
        if self.collection is None:
            return 0

        cutoff = datetime.now(timezone.utc) - timedelta(seconds=window_seconds)
        return await self.collection.count_documents(
            {
                "user_id": str(user_id),
                "created_at": {"$gte": cutoff},
            }
        )



