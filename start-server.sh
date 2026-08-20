#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Starting LLM Interview Assistant at http://127.0.0.1:8000"
echo "Keep this terminal open while using the web app."

./.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
