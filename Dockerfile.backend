# =============================================================
# NexusRAG - Standalone Backend Dockerfile
# Python 3.12 + FastAPI + Qdrant Vector Engine + Uvicorn
# =============================================================

FROM python:3.12-slim

WORKDIR /app

# Install system utilities and curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies with pip cache disabled for lean image
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code and data assets
COPY backend/ ./backend/
COPY data/ ./data/

# Create persistent runtime data directories
RUN mkdir -p backend/data/qdrant_storage backend/data/documents

# Environment variables
ENV HOST=0.0.0.0 \
    PORT=8000 \
    PYTHONUNBUFFERED=1

EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Launch FastAPI ASGI server
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
