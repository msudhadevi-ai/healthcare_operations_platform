# ADR-003: Prisma v7 with pg adapter for database access

**Date:** 2026-06-02
**Status:** Accepted

## Context

Prisma was chosen as the ORM for its TypeScript-first design, migration tooling, and readable query API. When the project was initialized, `npm install prisma` resolved to **Prisma v7**, which introduced a breaking change: the `url` property is no longer supported in `schema.prisma`'s datasource block.

Prisma v7 requires one of:
- **`adapter`** — a database adapter passed to the `PrismaClient` constructor for direct connections
- **`accelerateUrl`** — for Prisma Accelerate (cloud connection pooling)

## Decision

Use **`@prisma/adapter-pg`** with the standard `pg` Node.js driver. The `DATABASE_URL` is read at runtime and passed to the adapter constructor.

```ts
// src/lib/prisma.ts
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const client = new PrismaClient({ adapter });
```

The datasource URL for **migrations** is configured separately in `prisma.config.ts`:
```ts
datasource: { url: process.env["DATABASE_URL"] }
```

## Rationale

- **`@prisma/adapter-pg`** is the direct-connection adapter for PostgreSQL — the correct choice for a self-hosted or AWS RDS PostgreSQL instance.
- Prisma Accelerate was not chosen because it adds a third-party dependency for connection pooling that is unnecessary at the current scale and adds cost.
- Downgrading to Prisma v5/v6 was considered but rejected — staying on v7 keeps the project on the current release trajectory.

## Consequences

- After any change to `prisma/schema.prisma`, `npx prisma generate` must be run before building. The client is generated into `node_modules/@prisma/client`.
- The `DATABASE_URL` environment variable is required at **runtime** (for the adapter) and also at **migration time** (via `prisma.config.ts`). Both must be set.
- Connection pooling: `@prisma/adapter-pg` uses `pg.Pool` under the hood. For high-concurrency production workloads, configure PgBouncer or use AWS RDS Proxy in front of the database rather than relying solely on the default pool size.
