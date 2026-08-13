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
    # PID is the setsid-created process group leader (dev-start.sh runs the server via
    # `setsid npx ng serve ...`), so kill the whole group to take down the actual ng serve
    # child too, not just the leader/wrapper process.
    kill -- "-$PID"
    echo "Stopped dev server (PID $PID)"
else
    echo "Dev server PID $PID not running"
fi
rm -f "$PID_FILE"
