#!/usr/bin/env bash
# Reproduces PR #92's original one-off manual verification (see commit 03c8b96):
# docker build + standalone container smoke test, asserting root and a deep-link
# SPA route both return 200. Run from the repo root: bash docker/smoke-test.sh

set -euo pipefail

IMAGE_TAG="msp-creator-smoke-test"
CONTAINER_NAME="msp-creator-smoke-test-$$"
HOST_PORT="8095"

cleanup() {
	docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Building image..."
docker build -f docker/Dockerfile -t "$IMAGE_TAG" .

echo "Starting container..."
docker run -d --name "$CONTAINER_NAME" -p "$HOST_PORT:80" "$IMAGE_TAG" >/dev/null

echo "Waiting for the server to become ready..."
for _ in $(seq 1 30); do
	if curl -s -o /dev/null "http://localhost:$HOST_PORT/"; then
		break
	fi
	sleep 1
done

check() {
	local path="$1"
	local status
	status=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$HOST_PORT$path")
	if [ "$status" != "200" ]; then
		echo "FAIL: $path returned $status (expected 200)"
		docker logs "$CONTAINER_NAME"
		exit 1
	fi
	echo "OK: $path returned 200"
}

check "/"
check "/some/deep/link"

echo "Docker smoke test passed."
