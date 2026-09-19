# WeatherGPT — Production Deployment Guide 🚀

This document outlines deployment options, backup policies, disaster recovery workflows, and HTTPS configuration for WeatherGPT.

---

## 1. Deployment Architecture Options

### Option A: Single VPS / Docker Compose (Recommended for SIH / On-Premise)
Best suited for deployment on an Ubuntu VPS (DigitalOcean, Linode, AWS EC2, or institutional servers):

1. **Clone the repository**:
   ```bash
   git clone https://github.com/premjeetcsesr/weathergpt.git
   cd weathergpt
   ```
2. **Configure Environment Variables**:
   ```bash
   cp weathergpt-backend/.env.production.example weathergpt-backend/.env
   # Edit backend secrets (JWT_SECRET_KEY, OPENWEATHER_API_KEY, LLM_API_KEY, etc.)
   ```
3. **Build & Start Services**:
   ```bash
   docker compose build
   docker compose up -d
   ```
4. **Configure HTTPS with Let's Encrypt**:
   Install Certbot and obtain a free certificate:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d weathergpt.yourdomain.com
   ```

---

### Option B: Cloud-Native Managed Services
For high-availability horizontal scaling:
- **Frontend**: Deploy on **Vercel** or **Netlify** using root directory `weathergpt-frontend`. Set `VITE_API_BASE_URL=https://api.yourdomain.com/api/v1` and `VITE_WS_BASE_URL=wss://api.yourdomain.com/api/v1`.
- **Backend**: Deploy on **Render**, **Railway**, or **AWS App Runner** using `weathergpt-backend/Dockerfile`.
- **Database**: Managed **MongoDB Atlas** (M10+ cluster with IP access whitelist allowing backend VPC).

### Vercel Frontend Setup

1. Import the repository in Vercel and set **Root Directory** to `weathergpt-frontend`.
2. Use the default Vite settings, or set them explicitly:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`
3. Add these project environment variables for the Production environment:
   - `VITE_API_BASE_URL`: backend REST base URL, including `/api/v1`
   - `VITE_WS_BASE_URL`: backend WebSocket base URL; an `https://` value is upgraded to `wss://` by the frontend
   - `VITE_USE_MOCK_DATA`: `false`
   - `VITE_GOOGLE_MAPS_JAVASCRIPT_API_KEY`: optional browser-restricted key
4. Redeploy after changing environment variables. Vite embeds `VITE_*` values at build time.

`weathergpt-frontend/vercel.json` contains the SPA fallback so direct visits to routes such as
`/dashboard`, `/alerts`, and `/settings` continue to work after deployment.

---

## 2. MongoDB Backup & Disaster Recovery Strategy

### Daily Backup Routine (Cron)
Create a daily automated dump on the database host:
```bash
#!/bin/bash
# /opt/scripts/backup_weathergpt.sh
BACKUP_DIR="/var/backups/weathergpt"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# Run dump via Docker or native mongodump
docker exec weathergpt-mongodb mongodump --db weathergpt --archive="$BACKUP_DIR/weathergpt_$TIMESTAMP.archive" --gzip

# Retention: Delete backups older than 14 days
find "$BACKUP_DIR" -type f -name "*.archive" -mtime +14 -delete
```

### Restore Procedure
In case of database failure or disaster recovery:
```bash
docker exec -i weathergpt-mongodb mongorestore --nsInclude="weathergpt.*" --archive --gzip < /var/backups/weathergpt/weathergpt_latest.archive
```

---

## 3. Resilience & Graceful Degradation

- **External Provider Outage**: If OpenWeatherMap or IMD times out or returns 5xx, the multi-provider factory attempts fallback or serves cached observations (`CACHE_TTL_SECONDS=300`).
- **AI Service Outage**: If OpenAI or LLM provider is down, the chat and advisory modules gracefully degrade to deterministic, rule-based weather summaries without crashing the app.
- **WebSocket Reconnection**: The frontend client automatically reconnects with exponential backoff if the socket disconnects.
