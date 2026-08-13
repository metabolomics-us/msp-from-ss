#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

PID_FILE=".dev.pid"
LOG_FILE=".dev.log"
PORT="${PORT:-4200}"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "Dev server already running (PID $(cat "$PID_FILE")) at http://localhost:${PORT}/"
    exit 0
fi

nohup setsid npx ng serve --port "$PORT" > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
echo "Dev server starting (PID $(cat "$PID_FILE")), logging to $LOG_FILE"
echo "http://localhost:${PORT}/"
