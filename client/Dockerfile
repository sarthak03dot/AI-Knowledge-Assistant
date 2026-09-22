# =============================================================
# NexusRAG - Standalone Frontend Dockerfile
# Stage 1: Build React 19 App with Vite
# Stage 2: Serve High-Performance Static Bundle with Nginx Alpine
# =============================================================

# --- Stage 1: Builder ---
FROM node:20-alpine AS builder

WORKDIR /app/client

# Accept backend API URL at build time (e.g. https://api.yourdomain.com or empty for same-origin)
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

# Install dependencies (cached if package files unchanged)
COPY client/package*.json ./
RUN npm ci

# Copy client source code and build production bundle
COPY client/ ./
RUN npm run build

# --- Stage 2: Production Nginx Server ---
FROM nginx:1.27-alpine

# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy built frontend assets from builder stage
COPY --from=builder /app/client/dist /usr/share/nginx/html

# Copy custom Nginx SPA configuration
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
