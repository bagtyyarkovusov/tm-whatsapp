# syntax=docker/dockerfile:1

# Local development / CI image for the tm-whatsapp API.
# Built from the repo root so pnpm workspace resolution works.
FROM node:20-slim

# Prisma's engine detection needs the openssl CLI; curl is used by health checks.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Copy workspace manifest files first for deterministic dependency resolution.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/db/package.json ./packages/db/
COPY packages/crypto/package.json ./packages/crypto/

# The root package.json references a vendored tarball; preserve that path for
# pnpm's file: resolver before installing.
COPY vendor ./vendor

# Prisma's postinstall generates the query engine; give it the schema and
# openssl so it picks the correct debian-openssl-3.0.x engine.
COPY packages/db/prisma ./packages/db/prisma

# Install dependencies. The lockfile is frozen so CI and local builds match.
RUN pnpm install --frozen-lockfile

# Copy source and build the workspace. Turbo builds dependencies first.
COPY . .
RUN pnpm build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
