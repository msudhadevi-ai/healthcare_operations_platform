# ADR-002: Row-level tenancy via clinicId over schema-per-tenant

**Date:** 2026-06-02
**Status:** Accepted

## Context

The product is a SaaS application that will serve multiple independent clinics. Each clinic's data must be strictly isolated. Three common multi-tenancy patterns were considered:

1. **Database-per-tenant**: Each clinic gets its own PostgreSQL database.
2. **Schema-per-tenant**: Each clinic gets its own PostgreSQL schema within a shared database.
3. **Row-level tenancy**: All clinics share tables; every row has a `clinicId` foreign key.

## Decision

Use **row-level tenancy**: every table has a `clinicId` column and all queries are filtered by it.

## Rationale

- **Prototyping speed**: No tenant provisioning logic needed when onboarding a new clinic — just insert a `Clinic` row. Schema-per-tenant requires running migrations per tenant on signup.
- **Operational simplicity**: One database to back up, one connection pool to manage, one set of migrations to run. Database-per-tenant multiplies operational overhead linearly with clinic count.
- **Prisma compatibility**: Prisma's migration system works cleanly with a single schema. Schema-per-tenant requires workarounds (dynamic schema switching, custom migration runners).
- **Scale headroom**: Row-level tenancy scales comfortably to thousands of clinics on a single Postgres instance with proper indexing. All tenant-scoped tables have `@@index([clinicId])`.

## Consequences

- **Every query must include `clinicId`** as a filter condition. Forgetting this is a data leakage bug. This is enforced by convention, not the database engine. Future consideration: PostgreSQL Row Level Security (RLS) policies could enforce this at the DB layer.
- A noisy tenant (a clinic with very high query volume) affects all tenants on the same database instance. Mitigation at scale: move large tenants to dedicated read replicas or separate databases.
- If a clinic requests a full data export or deletion (right to erasure), all their rows are identifiable by `clinicId` — this is straightforward with row-level tenancy.
