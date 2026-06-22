#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
cd "${COZE_WORKSPACE_PATH}"

echo "Installing frontend dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offile --loglevel warn

echo "Installing backend dependencies..."
python3 -m venv backend/.venv 2>/dev/null || true
source backend/.venv/bin/activate
pip install -r backend/requirements.txt --quiet 2>/dev/null || pip install -r backend/requirements.txt
deactivate

echo "Prepare completed."
