#!/usr/bin/env bash

# Deterministic runtime acceptance for the local tm-whatsapp Compose topology.
# Proves liveness/readiness, failure/recovery, and named-volume persistence
# without ever passing --volumes to docker compose down.

set -euo pipefail

COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-tm-whatsapp}"
API_URL="http://127.0.0.1:3000"
SENTINEL_POSTGRES="compose-smoke-pg-$(date +%s)"
SENTINEL_REDIS="compose-smoke-redis-$(date +%s)"
SENTINEL_MINIO="compose-smoke-minio-$(date +%s)"

diagnostics() {
  echo "==> Diagnostics"
  docker compose --project-name "$COMPOSE_PROJECT_NAME" ps || true
  echo
  echo "==> API logs (last 50 lines)"
  docker compose --project-name "$COMPOSE_PROJECT_NAME" logs --tail 50 api || true
  echo
  echo "==> Postgres logs (last 30 lines)"
  docker compose --project-name "$COMPOSE_PROJECT_NAME" logs --tail 30 postgres || true
  echo
  echo "==> Redis logs (last 30 lines)"
  docker compose --project-name "$COMPOSE_PROJECT_NAME" logs --tail 30 redis || true
  echo
  echo "==> MinIO logs (last 30 lines)"
  docker compose --project-name "$COMPOSE_PROJECT_NAME" logs --tail 30 minio || true
  echo
}

cleanup() {
  echo "==> Running non-destructive teardown"
  docker compose --project-name "$COMPOSE_PROJECT_NAME" down --remove-orphans || true
}

trap 'echo "==> Smoke test failed"; diagnostics; cleanup; exit 1' ERR
trap 'cleanup' EXIT

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "smoke test requires command: $1" >&2
    exit 1
  fi
}

require_command docker
require_command curl

wait_for_ready() {
  local expected_status="$1"
  local deadline="$2"
  local elapsed=0
  while [ "$elapsed" -lt "$deadline" ]; do
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health/ready" || echo "000")
    if [ "$status" = "$expected_status" ]; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  echo "==> Timed out waiting for readiness HTTP $expected_status" >&2
  return 1
}

echo "==> Starting Compose stack"
docker compose --project-name "$COMPOSE_PROJECT_NAME" up --wait --wait-timeout 120

echo "==> Verifying /health/live returns 200"
curl -sf "$API_URL/health/live" >/dev/null

echo "==> Verifying /health/ready returns 200"
wait_for_ready 200 60

echo "==> Stopping redis to test readiness degradation"
docker compose --project-name "$COMPOSE_PROJECT_NAME" stop redis

echo "==> Verifying /health/live still returns 200 during dependency loss"
curl -sf "$API_URL/health/live" >/dev/null

echo "==> Verifying /health/ready returns 503 during dependency loss"
wait_for_ready 503 60

echo "==> Restarting redis"
docker compose --project-name "$COMPOSE_PROJECT_NAME" start redis

echo "==> Verifying /health/ready returns 200 after recovery"
wait_for_ready 200 120

echo "==> Writing non-secret sentinels to named volumes"
docker compose --project-name "$COMPOSE_PROJECT_NAME" exec -T postgres psql -U postgres -d tmwhatsapp \
  -c "CREATE TABLE IF NOT EXISTS smoke_sentinel (id text primary key);" \
  -c "INSERT INTO smoke_sentinel VALUES ('$SENTINEL_POSTGRES') ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id;" \
  >/dev/null

docker compose --project-name "$COMPOSE_PROJECT_NAME" exec -T redis redis-cli SET smoke:sentinel "$SENTINEL_REDIS" >/dev/null

docker compose --project-name "$COMPOSE_PROJECT_NAME" exec -T minio sh -c \
  "mc alias set local http://localhost:9000 minioadmin minioadmin >/dev/null 2>&1; \
   mc mb local/tm-whatsapp >/dev/null 2>&1; \
   printf '%s' '$SENTINEL_MINIO' | mc pipe local/tm-whatsapp/smoke-sentinel.txt >/dev/null 2>&1"

echo "==> Running docker compose down --remove-orphans (volumes preserved)"
docker compose --project-name "$COMPOSE_PROJECT_NAME" down --remove-orphans

echo "==> Restarting stack to verify named-volume persistence"
docker compose --project-name "$COMPOSE_PROJECT_NAME" up --wait --wait-timeout 120

echo "==> Verifying postgres sentinel survived"
pg_result=$(docker compose --project-name "$COMPOSE_PROJECT_NAME" exec -T postgres psql -U postgres -d tmwhatsapp -t -c \
  "SELECT id FROM smoke_sentinel WHERE id = '$SENTINEL_POSTGRES';")
if ! echo "$pg_result" | grep -q "$SENTINEL_POSTGRES"; then
  echo "Postgres sentinel missing" >&2
  exit 1
fi

echo "==> Verifying redis sentinel survived"
redis_result=$(docker compose --project-name "$COMPOSE_PROJECT_NAME" exec -T redis redis-cli GET smoke:sentinel)
if [ "$redis_result" != "$SENTINEL_REDIS" ]; then
  echo "Redis sentinel missing or mismatched (got: '$redis_result')" >&2
  exit 1
fi

echo "==> Verifying minio sentinel survived"
minio_result=$(docker compose --project-name "$COMPOSE_PROJECT_NAME" exec -T minio sh -c \
  "mc alias set local http://localhost:9000 minioadmin minioadmin >/dev/null 2>&1; \
   mc cat local/tm-whatsapp/smoke-sentinel.txt")
if [ "$minio_result" != "$SENTINEL_MINIO" ]; then
  echo "MinIO sentinel missing or mismatched (got: '$minio_result')" >&2
  exit 1
fi

echo "==> All Compose smoke tests passed"
