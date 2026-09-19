# ==========================================
# Stage 1: Build React/Vite Static Distribution
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for efficient layer caching
COPY package*.json ./
RUN npm ci

# Copy source code and build config
COPY . .

# Build arguments for production environment
ARG VITE_API_BASE_URL=https://weathergpt-backend-pb1q.onrender.com/api/v1
ARG VITE_WS_BASE_URL=https://weathergpt-backend-pb1q.onrender.com/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_BASE_URL=$VITE_WS_BASE_URL

RUN npm run build

# ==========================================
# Stage 2: Serve via Lightweight Nginx Alpine
# ==========================================
FROM nginx:1.25-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
