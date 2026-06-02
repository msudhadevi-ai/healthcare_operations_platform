# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server with Turbopack (http://localhost:3000)
npm run build        # Production build (also used to type-check)
npm run lint         # ESLint

# Database
npx prisma generate              # Regenerate Prisma client after schema changes
npx prisma migrate dev --name <name>   # Create and apply a migration
npx prisma migrate deploy        # Apply migrations in production
npx prisma studio                # Open database GUI

# Docker (local dev database)
docker compose up postgres -d    # Start PostgreSQL only
docker compose up -d             # Start full stack (app + postgres)
```

There are no tests currently. `npm run build` is the primary way to catch type errors and lint issues.

## Architecture

### Multi-tenancy
Every database table has a `clinicId` column. All queries **must** filter by `clinicId` — this is the row-level tenancy boundary separating clinic data. The `clinicId` is forwarded from the JWT session via request headers (`x-clinic-id`) by the middleware; API routes read it from `request.headers.get("x-clinic-id")`.

### Auth flow
`src/middleware.ts` intercepts every non-public request, verifies the JWT from the `apthal_session` httpOnly cookie, and injects `x-user-id`, `x-clinic-id`, and `x-user-role` headers into the request. API routes rely entirely on these headers for identity — never re-parse the cookie themselves.

Roles: `ADMIN | DOCTOR | RECEPTIONIST | PHARMACIST`. Role checks are done per-route by reading `x-user-role`.

### Prisma v7 setup
Prisma v7 removed `url` from `schema.prisma`. The connection string lives in `prisma.config.ts`. The client is instantiated with a `PrismaPg` adapter (from `@prisma/adapter-pg`) — see `src/lib/prisma.ts`. After any schema change, run `prisma generate` before building.

### S3 for patient records (images, DICOM, PDFs)
Records are never proxied through the server. The flow is:
1. Client calls `POST /api/records/upload-url` → gets a 5-minute presigned PUT URL + `s3Key`
2. Client uploads directly to S3 using that URL
3. Client calls `POST /api/records` to save the metadata (including `s3Key`) to the DB

Download URLs are generated fresh on every `GET /api/records` call via `getDownloadPresignedUrl`. The `s3Key` is never sent to the client — only the temporary signed URL.

### HIPAA audit logging
`src/lib/audit.ts` → `writeAuditLog()` must be called on every PHI read, create, update, delete, and file upload. The `details` field in `AuditLog` is JSON string metadata only — **never store raw PHI** (names, DOB, etc.) in audit log details.

### API route conventions
- All routes return `{ success: boolean, data?, error?, message? }`
- Input validation uses `zod` with `.safeParse()` — return 400 on failure
- RBAC check: read `x-user-role` header, return 403 if insufficient
- Audit log after every meaningful operation

### Key files
| File | Purpose |
|---|---|
| `src/middleware.ts` | JWT verification, injects auth headers |
| `src/lib/auth.ts` | `signToken`, `verifyToken`, cookie options (8h expiry) |
| `src/lib/prisma.ts` | Singleton Prisma client with pg adapter |
| `src/lib/s3.ts` | Presigned upload/download URL generation |
| `src/lib/audit.ts` | HIPAA audit log writer |
| `prisma/schema.prisma` | All DB models |
| `prisma.config.ts` | Prisma v7 datasource + migration config |
| `next.config.ts` | `output: "standalone"` (Docker), security headers |

### UI components
Custom-built minimal components in `src/components/ui/` (Button, Card, Input, Label, Badge) using `class-variance-authority` + Tailwind. No full shadcn installation — add components manually to `src/components/ui/` as needed. Icons from `lucide-react`.

## Environment variables

See `.env.example`. Required at runtime:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — min 64 chars, used for all session tokens
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` — S3 for patient records
