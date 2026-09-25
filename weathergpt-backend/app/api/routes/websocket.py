from typing import Any, Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.logging import logger
from app.services.websocket_manager import get_websocket_manager

router = APIRouter(prefix="/ws", tags=["WebSocket Alerts"])


@router.websocket("/alerts")
async def websocket_alerts_endpoint(websocket: WebSocket):
    """
    Real-time WebSocket endpoint for weather alerts.
    Supports location-based subscriptions, ping heartbeats, and instant alerts broadcast.
    Endpoint: /api/v1/ws/alerts
    """
    ws_manager = get_websocket_manager()
    await ws_manager.connect(websocket)

    try:
        while True:
            # Receive client actions
            data: Dict[str, Any] = await websocket.receive_json()
            msg_type = data.get("type", "").lower()

            if msg_type == "subscribe":
                location = data.get("location", {})
                city = location.get("city") if isinstance(location, dict) else str(location or "")
                if city:
                    await ws_manager.subscribe(websocket, city=city)
                else:
                    await ws_manager.send_personal_message(
                        websocket,
                        {"type": "error", "message": "City name is required for subscription."}
                    )

            elif msg_type == "unsubscribe":
                location = data.get("location", {})
                city = location.get("city") if isinstance(location, dict) else str(location or "")
                if city:
                    await ws_manager.unsubscribe(websocket, city=city)
                    await ws_manager.send_personal_message(
                        websocket,
                        {"type": "unsubscription_confirmed", "location": city}
                    )

            elif msg_type == "ping":
                await ws_manager.send_personal_message(websocket, {"type": "pong"})

            else:
                logger.debug(f"Received unknown WebSocket message type: {msg_type}")

    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as exc:
        logger.warning(f"Unexpected WebSocket error: {exc}")
        await ws_manager.disconnect(websocket)
