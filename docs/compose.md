# Local Compose topology

The repo ships a portable `compose.yaml` that mirrors the Phase R (Railway)
service topology using plain containers (ADR-0001 portability rules). It is the
authoritative local runtime for integration work and is exercised by CI in every
PR.

## Services

| Service | Image | Host port | Volume |
| --- | --- | --- | --- |
| `api` | `apps/api/Dockerfile` | `127.0.0.1:3000` | none (stateless) |
| `postgres` | `postgres:16-alpine` | none | `postgres-data` |
| `redis` | `redis:7-alpine` | none | `redis-data` |
| `minio` | `minio/minio:RELEASE.2025-09-07T16-13-09Z` | none | `minio-data` |

Only the API publishes a host port by default. All services attach to a private
bridge network named `tm-whatsapp`.

## Quick start

```bash
# Build the API image and start everything
docker compose up --build --wait --wait-timeout 120

# Check endpoints
curl --fail http://127.0.0.1:3000/health/live
curl --fail http://127.0.0.1:3000/health/ready
```

## Health endpoints

- `GET /health/live` returns `200` as long as the API process responds.
- `GET /health/ready` returns `200` only when Postgres, Redis, and MinIO are all
  usable; otherwise it returns `503` with a `degraded` body that lists the
  failing component by name. No credentials or connection strings are exposed.

## Runtime acceptance

Run the deterministic smoke suite:

```bash
./scripts/compose-smoke.sh
```

The script proves:

- liveness stays `200` and readiness is `200` after startup;
- readiness becomes `503` when a dependency is stopped and returns to `200` after
  recovery;
- non-secret sentinels written to each named volume survive a
  `docker compose down --remove-orphans` cycle.

## Teardown

```bash
# Remove containers and networks; preserve named volumes
docker compose down --remove-orphans

# DANGER: only run this when you intend to wipe local state
docker compose down --volumes
```

CI and automation only ever use `docker compose down --remove-orphans`.
Destructive volume removal is a separate explicit human action.

## Environment variables

The Compose file pins local-only defaults. Override them with a `.env` file or
`docker compose --env-file` if needed:

| Variable | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://postgres:postgres@postgres:5432/tmwhatsapp?schema=public` | Postgres connection |
| `REDIS_URL` | `redis://redis:6379` | Redis connection |
| `S3_ENDPOINT` | `http://minio:9000` | MinIO API |
| `S3_ACCESS_KEY_ID` | `minioadmin` | MinIO root user |
| `S3_SECRET_ACCESS_KEY` | `minioadmin` | MinIO root password |
| `S3_REGION` | `us-east-1` | S3 region (ignored by MinIO) |

These values are acceptable for local development only. Production and staging
secrets are injected by Railway and never committed.
