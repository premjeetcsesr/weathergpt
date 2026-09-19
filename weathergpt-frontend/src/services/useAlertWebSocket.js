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
export function useAlertWebSocket({ activeCity = '', onAlertReceived, onAlertExpired } = {}) {
  const [status, setStatus] = useState('connecting'); // 'connected' | 'connecting' | 'disconnected'
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [latestToast, setLatestToast] = useState(null);

  const wsRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const subscribeCity = useCallback((city) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && typeof city === 'string' && city.trim()) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        location: { city: city.trim() },
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
        const city = typeof activeCity === 'string' ? activeCity.trim() : '';
        if (city) {
          socket.send(JSON.stringify({
            type: 'subscribe',
            location: { city },
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
            if (!newAlert || typeof newAlert !== 'object') {
              console.warn('Ignoring WebSocket alert with invalid payload:', data);
              return;
            }

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
          } else if (data.type === 'community_report_created' || data.type === 'community_report_verified') {
            const rep = data.report;
            if (rep) {
              const isVerified = data.type === 'community_report_verified';
              const catFormatted = (rep.category || 'Incident').replace('_', ' ').toUpperCase();
              const alertItem = {
                id: `comm_${rep.id}`,
                type: 'community_report',
                event: isVerified ? 'Verified Community Report' : 'Community Weather Report',
                severity: isVerified ? 'Severe' : 'Moderate',
                headline: `📸 ${catFormatted} at ${rep.location_name || 'Ground Location'}`,
                description: `Citizen ground-truth observation reported. View live pin on Weather Map.`,
                area_desc: rep.location_name || 'Ground Observation',
                source: 'COMMUNITY',
                is_community: true,
                created_at: rep.reported_at || new Date().toISOString(),
              };
              setLatestToast(alertItem);
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('community-report-added', { detail: rep }));
              }
            }
          }
        } catch (e) {
          console.warn('Failed to parse WebSocket message:', e);
        }
      };

      socket.onclose = () => {
        // Ignore close events from sockets replaced by a newer connection.
        if (!isMountedRef.current || wsRef.current !== socket) return;
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
        wsRef.current = null;
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
