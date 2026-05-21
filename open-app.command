#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

APP_URL="http://127.0.0.1:8000"

if ! curl -fsS "$APP_URL/api/health" >/dev/null 2>&1; then
  osascript -e "tell application \"Terminal\" to do script \"cd '$PWD' && ./start-server.sh\""
  for _ in {1..30}; do
    if curl -fsS "$APP_URL/api/health" >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
fi

open "$APP_URL"
