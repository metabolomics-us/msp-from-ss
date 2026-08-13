#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

PID_FILE=".dev.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "No dev server PID file found; nothing to stop."
    exit 0
fi

PID="$(cat "$PID_FILE")"
if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo "Stopped dev server (PID $PID)"
else
    echo "Dev server PID $PID not running"
fi
rm -f "$PID_FILE"
