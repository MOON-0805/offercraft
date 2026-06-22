#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
cd "${COZE_WORKSPACE_PATH}"

PORT=5000
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-${PORT}}"

source backend/.venv/bin/activate
export DEPLOY_RUN_PORT
echo "Starting FastAPI production server on port ${DEPLOY_RUN_PORT}..."
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port "${DEPLOY_RUN_PORT}"
