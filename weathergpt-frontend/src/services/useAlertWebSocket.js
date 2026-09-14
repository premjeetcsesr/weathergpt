import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_ALERTS_URL } from './apiConfig';

/**
 * Custom hook managing WebSocket connection for real-time weather alerts.
 * Features:
 * - Automatic exponential backoff reconnect
 * - Connection states: 'connected', 'connecting', 'disconnected'
 * - Location-based topic subscription
 * - Heartbeat ping
 */
export function useAlertWebSocket({ activeCity = 'Kanpur', onAlertReceived, onAlertExpired } = {}) {
  const [status, setStatus] = useState('connecting'); // 'connected' | 'connecting' | 'disconnected'
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [latestToast, setLatestToast] = useState(null);

  const wsRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const subscribeCity = useCallback((city) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && city) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        location: { city },
      }));
    }
  }, []);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setStatus('connecting');

    try {
      const socket = new WebSocket(WS_ALERTS_URL);
      wsRef.current = socket;

      socket.onopen = () => {
        if (!isMountedRef.current) return;
        setStatus('connected');
        reconnectAttemptRef.current = 0;

        // Immediately subscribe to current active location
        if (activeCity) {
          socket.send(JSON.stringify({
            type: 'subscribe',
            location: { city: activeCity },
          }));
        }

        // Start heartbeat ping every 25s
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      socket.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'weather_alert') {
            const newAlert = data.alert;
            setActiveAlerts((prev) => {
              const existingIdx = prev.findIndex((a) => (a.id || a.alert_id) === (newAlert.id || newAlert.alert_id));
              if (existingIdx >= 0) {
                const copy = [...prev];
                copy[existingIdx] = newAlert;
                return copy;
              }
              return [newAlert, ...prev];
            });

            // Set toast popup
            setLatestToast(newAlert);
            if (onAlertReceived) onAlertReceived(newAlert);
          } else if (data.type === 'alert_expired') {
            const expId = data.alert_id;
            setActiveAlerts((prev) => prev.filter((a) => (a.id || a.alert_id) !== expId));
            if (onAlertExpired) onAlertExpired(expId);
          }
        } catch (e) {
          console.warn('Failed to parse WebSocket message:', e);
        }
      };

      socket.onclose = () => {
        if (!isMountedRef.current) return;
        setStatus('disconnected');
        clearInterval(pingIntervalRef.current);

        // Schedule reconnection with exponential backoff (1s, 2s, 4s, 8s, max 30s)
        const attempt = reconnectAttemptRef.current;
        const delay = Math.min(1000 * Math.pow(1.8, attempt), 30000);
        reconnectAttemptRef.current += 1;

        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connect();
          }
        }, delay);
      };

      socket.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
        socket.close();
      };
    } catch (err) {
      console.warn('Failed to construct WebSocket:', err);
      setStatus('disconnected');
    }
  }, [activeCity, onAlertReceived, onAlertExpired]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      clearInterval(pingIntervalRef.current);
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // When activeCity changes, send new subscribe message
  useEffect(() => {
    if (activeCity) {
      subscribeCity(activeCity);
    }
  }, [activeCity, subscribeCity]);

  const dismissToast = useCallback(() => {
    setLatestToast(null);
  }, []);

  return {
    status, // 'connected' | 'connecting' | 'disconnected'
    activeAlerts,
    latestToast,
    dismissToast,
    subscribeCity,
  };
}
