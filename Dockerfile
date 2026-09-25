# Multi-Stage Dockerfile for NexusRAG (React 19 + FastAPI + Qdrant)

# Stage 1: Build React 19 Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci || npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production Python Application
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code and built frontend bundle
COPY backend/ ./backend/
COPY --from=frontend-builder /app/client/dist ./client/dist

# Ensure local runtime storage directories exist
RUN mkdir -p backend/data/qdrant_storage backend/data/documents

# Environment variables
ENV PORT=8000 \
    HOST=0.0.0.0 \
    PYTHONUNBUFFERED=1

EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

# Start FastAPI server with Uvicorn (dynamically honoring Render's $PORT)
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
