#!/usr/bin/env bash
set -euo pipefail

# ==========================================================
# ⚡ NexusRAG — Universal Startup Script
# ==========================================================

MODE="${1:-dev}"
VENV_DIR=".venv"

# Bash environments on Windows use Scripts/, while macOS and Linux use bin/.
if command -v python3 >/dev/null 2>&1; then
    SYSTEM_PYTHON="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
    SYSTEM_PYTHON="$(command -v python)"
else
    echo "Python 3 is required but was not found on PATH."
    exit 1
fi

echo "=========================================================="
echo "⚡ NexusRAG — AI Knowledge Assistant & Vector DB"
echo "=========================================================="

if [ "$MODE" = "--docker" ] || [ "$MODE" = "docker" ]; then
    echo "🐳 Launching via Docker Compose (Decoupled Production Containers)..."
    docker compose up --build
    exit 0
fi

# 1. Setup Python Virtual Environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating Python virtual environment (.venv)..."
    "$SYSTEM_PYTHON" -m venv "$VENV_DIR"
fi

# 2. Select the virtual environment Python executable.
if [ -x "$VENV_DIR/bin/python" ]; then
    VENV_PYTHON="$VENV_DIR/bin/python"
elif [ -x "$VENV_DIR/Scripts/python.exe" ]; then
    VENV_PYTHON="$VENV_DIR/Scripts/python.exe"
else
    echo "The Python virtual environment is incomplete. Remove .venv and run this script again."
    exit 1
fi

# 3. Install backend dependencies
echo "📥 Checking Python dependencies in backend/requirements.txt..."
"$VENV_PYTHON" -m pip install -r backend/requirements.txt --quiet

# 4. Check & build frontend bundle if missing
if [ ! -d "client/dist" ]; then
    echo "⚛️ Building React Client in client/ ..."
    (cd client && npm install && npm run build)
fi

# 5. Start Server based on mode
if [ "$MODE" = "--prod" ] || [ "$MODE" = "prod" ]; then
    echo "🚀 Starting Production Multi-Worker Server at http://0.0.0.0:8000 ..."
    "$VENV_PYTHON" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 2
else
    echo "🚀 Starting Local Dev Server (with hot reload) at http://localhost:8000 ..."
    echo "💡 Tip: Run './start.sh --docker' to run in Docker, or './start.sh --prod' for production mode."
    "$VENV_PYTHON" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
fi
