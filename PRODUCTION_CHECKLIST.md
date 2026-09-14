# WeatherGPT — Production Readiness Checklist 🚀

This checklist verifies all security, operational, and architectural requirements for SIH 2026 Problem Statement **SIH26068**.

---

## 1. Security Checklist
- [x] **Zero Hardcoded Secrets**: No API keys, JWT secrets, or DB passwords stored in source code.
- [x] **Secure Environment Variables**: Loaded via `.env` with `.env.example` templates.
- [x] **Strict Password Hashing**: Passwords hashed using bcrypt with salt rounds >= 12.
- [x] **Password Strength Policy**: Validated with minimum 8 characters and complexity rules.
- [x] **JWT Security**: Signed using `HS256`, environment-provided secret, and sensible expiration.
- [x] **Role-Based Access Control (RBAC)**: `USER` and `ADMIN` role separation protecting diagnostic/provider endpoints.
- [x] **API Rate Limiting**: In-memory sliding-window protection on `/auth/login`, `/auth/register`, `/chat`, and `/weather`.
- [x] **CORS Hardening**: Strict origin whitelisting in production (`CORS_ORIGINS`), disallowing wildcard `*`.
- [x] **HTTP Security Headers**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security` (HSTS enabled for production).
- [x] **Frontend Secret Stripping**: React frontend never receives OpenAI, OpenWeather, or IMD API keys.
- [x] **Secure Tile Proxy**: Map weather tiles routed through `/api/v1/weather/tiles/...` keeping provider keys server-side.

---

## 2. Backend Checklist
- [x] **Production Flags**: `DEBUG=false` and `ENVIRONMENT=production` enforced.
- [x] **Sanitized Error Responses**: Internal tracebacks and database connection strings suppressed from public API errors.
- [x] **Structured Logging & Correlation**: `X-Request-ID` attached to all request cycles and log messages.
- [x] **Liveness Probe**: `GET /health` returning lightweight HTTP 200.
- [x] **Readiness Probe**: `GET /health/ready` verifying MongoDB connectivity and provider readiness.
- [x] **Provider Resilience**: Timeouts (5–10s), retry limits, and non-blocking fallback mechanisms.
- [x] **Source Transparency**: Fallback and prototype data explicitly attributed; never spoofed as IMD government bulletins.

---

## 3. Frontend Checklist
- [x] **Production Bundle**: `npm run build` generates optimized bundle with 0 errors.
- [x] **Environment-Aware URLs**: Automatic fallback to `/api/v1` for HTTP and `wss://` for secure WebSockets.
- [x] **No Leaked Vite Variables**: `VITE_` variables restricted strictly to public endpoints.
- [x] **Input Sanitization**: Length validation on chat and query inputs.

---

## 4. Database Checklist
- [x] **Network Isolation**: MongoDB exposed only to backend within Docker bridge network.
- [x] **Index Coverage**: Verified compound and TTL indexes on `alerts`, `users`, `climate_history`, and `official_warnings`.
- [x] **Automated Backup Strategy**: Documented `mongodump` cron routines and retention policies.

---

## 5. Deployment & Containerization Checklist
- [x] **Non-Root Docker Containers**: Backend runs under unprivileged `appuser`.
- [x] **Multi-Stage Frontend Build**: Static assets served from lightweight Alpine Nginx image.
- [x] **Reverse Proxy Integration**: Ingress Nginx terminates connections and proxies `/api/` and WebSockets.
- [x] **Automated CI**: GitHub Actions workflow running pytest, frontend build, and docker compose validation.
