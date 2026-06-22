#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
cd "${COZE_WORKSPACE_PATH}"

PORT=5000
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-${PORT}}"

# Start FastAPI backend on 5001 (proxied by Vite in dev)
BACKEND_PORT=5001
source backend/.venv/bin/activate 2>/dev/null || true
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port ${BACKEND_PORT} --reload --reload-dir backend &
BACKEND_PID=$!

sleep 1

# Start Vite dev server on DEPLOY_RUN_PORT (proxies /api to backend)
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT}" pnpm vite --host 0.0.0.0 --port "${DEPLOY_RUN_PORT}" &
VITE_PID=$!

echo "Backend PID: ${BACKEND_PID} (port ${BACKEND_PORT}), Vite PID: ${VITE_PID} (port ${DEPLOY_RUN_PORT})"

# Wait for either to exit
wait -n 2>/dev/null || wait
