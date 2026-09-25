import asyncio
from typing import Any, Dict, List, Optional, Set
from fastapi import WebSocket
from app.core.config import get_settings
from app.core.logging import logger

settings = get_settings()


class WebSocketManager:
    """Manages active WebSocket client connections, user isolation, and location subscriptions."""

    def __init__(self):
        # Set of all active WebSocket connections
        self.active_connections: Set[WebSocket] = set()
        # Mapping: websocket -> set of lowercase city subscriptions
        self.connection_subscriptions: Dict[WebSocket, Set[str]] = {}
        # Mapping: lowercase city -> set of subscribed websockets
        self.city_subscribers: Dict[str, Set[WebSocket]] = {}
        # Mapping: user_id -> set of websockets
        self.user_subscribers: Dict[str, Set[WebSocket]] = {}
        self.connection_users: Dict[WebSocket, str] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> bool:
        """Accept incoming WebSocket connection and register tracking if within limits."""
        max_connections = getattr(settings, "MAX_WS_CONNECTIONS", 100)
        async with self._lock:
            if len(self.active_connections) >= max_connections:
                logger.warning(f"WebSocket connection rejected: limit of {max_connections} reached.")
                await websocket.close(code=1008, reason="Server connection limit reached")
                return False

            await websocket.accept()
            self.active_connections.add(websocket)
            self.connection_subscriptions[websocket] = set()
        logger.info(f"WebSocket client connected. Total active connections: {len(self.active_connections)}")
        return True

    async def register_user(self, websocket: WebSocket, user_id: str) -> None:
        """Associate connection with authenticated user ID for isolated private alerts."""
        if not user_id:
            return
        async with self._lock:
            if websocket in self.active_connections:
                self.connection_users[websocket] = str(user_id)
                if str(user_id) not in self.user_subscribers:
                    self.user_subscribers[str(user_id)] = set()
                self.user_subscribers[str(user_id)].add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        """Remove connection and cleanup all topic and user subscriptions."""
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

            subscribed_cities = self.connection_subscriptions.pop(websocket, set())
            for city in subscribed_cities:
                if city in self.city_subscribers:
                    self.city_subscribers[city].discard(websocket)
                    if not self.city_subscribers[city]:
                        self.city_subscribers.pop(city, None)

            user_id = self.connection_users.pop(websocket, None)
            if user_id and user_id in self.user_subscribers:
                self.user_subscribers[user_id].discard(websocket)
                if not self.user_subscribers[user_id]:
                    self.user_subscribers.pop(user_id, None)

        logger.info(f"WebSocket client disconnected. Total active connections: {len(self.active_connections)}")

    async def subscribe(self, websocket: WebSocket, city: str) -> None:
        """Subscribe a connection to a specific location's weather alerts."""
        if not city or not city.strip():
            return

        clean_city = city.strip().lower()
        async with self._lock:
            if websocket in self.active_connections:
                self.connection_subscriptions[websocket].add(clean_city)
                if clean_city not in self.city_subscribers:
                    self.city_subscribers[clean_city] = set()
                self.city_subscribers[clean_city].add(websocket)

        logger.debug(f"Client subscribed to '{clean_city}'.")
        # Send confirmation to client
        await self.send_personal_message(
            websocket,
            {
                "type": "subscription_confirmed",
                "location": city.strip(),
            },
        )

    async def unsubscribe(self, websocket: WebSocket, city: str) -> None:
        """Unsubscribe connection from a specific location."""
        if not city:
            return
        clean_city = city.strip().lower()
        async with self._lock:
            if websocket in self.connection_subscriptions:
                self.connection_subscriptions[websocket].discard(clean_city)
            if clean_city in self.city_subscribers:
                self.city_subscribers[clean_city].discard(websocket)

    async def send_personal_message(self, websocket: WebSocket, message: Dict[str, Any]) -> bool:
        """Send JSON payload to a single connection with error handling."""
        try:
            await websocket.send_json(message)
            return True
        except Exception as exc:
            logger.warning(f"Error sending message to client: {exc}. Pruning connection.")
            await self.disconnect(websocket)
            return False

    async def broadcast(self, message: Dict[str, Any]) -> int:
        """Broadcast payload to all currently connected clients."""
        async with self._lock:
            connections = list(self.active_connections)

        sent_count = 0
        for ws in connections:
            success = await self.send_personal_message(ws, message)
            if success:
                sent_count += 1
        return sent_count

    async def broadcast_to_location(self, city: str, message: Dict[str, Any]) -> int:
        """
        Broadcast alert to subscribers of the location.
        Also broadcasts to clients that have not subscribed to any specific city (global listeners).
        """
        clean_city = city.strip().lower()
        async with self._lock:
            target_clients = set(self.city_subscribers.get(clean_city, set()))
            # Clients that have subscribed to no specific city receive all alerts
            for ws, subs in self.connection_subscriptions.items():
                if len(subs) == 0:
                    target_clients.add(ws)

        sent_count = 0
        for ws in list(target_clients):
            success = await self.send_personal_message(ws, message)
            if success:
                sent_count += 1
        return sent_count

    async def send_to_user(self, user_id: str, message: Dict[str, Any]) -> int:
        """
        Send a notification exclusively to the authenticated user's active sockets.
        Guarantees User A never receives User B's notifications.
        """
        if not user_id:
            return 0
        async with self._lock:
            clients = list(self.user_subscribers.get(str(user_id), set()))

        sent_count = 0
        for ws in clients:
            success = await self.send_personal_message(ws, message)
            if success:
                sent_count += 1
        return sent_count


    async def disconnect_all(self) -> None:
        """Cleanly close all connections during server shutdown."""
        async with self._lock:
            connections = list(self.active_connections)
            self.active_connections.clear()
            self.connection_subscriptions.clear()
            self.city_subscribers.clear()

        for ws in connections:
            try:
                await ws.close(code=1000, reason="Server shutting down")
            except Exception:
                pass
        logger.info(f"Closed {len(connections)} active WebSocket connections.")


# Global singleton instance
ws_manager = WebSocketManager()


def get_websocket_manager() -> WebSocketManager:
    """Dependency provider for the WebSocketManager singleton."""
    return ws_manager
