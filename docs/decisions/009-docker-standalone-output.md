# ADR-009: Docker with Next.js standalone output for cloud deployment

**Date:** 2026-06-02
**Status:** Accepted

## Context

The application needs to be runnable locally (development), deployable to cloud infrastructure (AWS ECS, GCP Cloud Run, or similar), and upgradable without a full rebuild of the containerization strategy. The requirements are:

- Single-clinic local development must be simple (one command)
- Cloud deployment must be container-based for portability across providers
- Production images should be small and not include dev dependencies

## Decision

Use **`output: "standalone"` in `next.config.ts`** combined with a **multi-stage Dockerfile**.

The `docker-compose.yml` provides:
- `postgres` service for local development (PostgreSQL 16 Alpine)
- `app` service for running the full production stack locally

The Dockerfile uses:
- **Stage 1 (`builder`)**: Full Node.js 20 Alpine image, installs all deps, runs `prisma generate` and `next build`
- **Stage 2 (`runner`)**: Minimal Node.js 20 Alpine, copies only `.next/standalone`, `.next/static`, `public`, and Prisma client

## Rationale

- **`output: "standalone"`** produces a self-contained `server.js` with only the necessary `node_modules` inlined (typically ~50–100 MB vs 500+ MB for a full install). This dramatically reduces image size and cold-start time.
- **Multi-stage build** ensures the production image contains no build tools, TypeScript compiler, or dev dependencies.
- **PostgreSQL in Docker Compose** for local dev avoids requiring developers to install PostgreSQL natively. The `postgres_data` volume persists data across restarts.
- **Cloud-agnostic**: The resulting Docker image runs on AWS ECS, GCP Cloud Run, Azure Container Apps, or any container host. No cloud-specific build process is assumed.

## Consequences

- `next build` must succeed before the Docker image can be built. Build errors will cause the Docker build to fail at the builder stage.
- The `Prisma generate` step in the Dockerfile uses the schema at build time. If the schema changes, a new image must be built and deployed — there is no runtime schema refresh.
- Database migrations (`prisma migrate deploy`) are **not run automatically** by the container on startup. They must be run as a separate step in the deployment pipeline (e.g. a one-off ECS task or init container) before the new app version starts serving traffic.
- The `docker-compose.yml` `app` service is for testing the production build locally. Normal development uses `npm run dev` directly, not Docker.
