# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) — logs of significant technical and architectural choices made for the Apthal project.

Each record captures: the context, the decision, the alternatives that were considered, and the consequences.

| # | Title | Status |
|---|---|---|
| [001](./001-framework-nextjs.md) | Use Next.js as the full-stack framework | Accepted |
| [002](./002-multi-tenancy-row-level.md) | Row-level tenancy via clinicId over schema-per-tenant | Accepted |
| [003](./003-prisma-v7-pg-adapter.md) | Prisma v7 with pg adapter for database access | Accepted |
| [004](./004-jwt-httponly-cookie-auth.md) | JWT in httpOnly cookies for session management | Accepted |
| [005](./005-s3-presigned-urls-patient-records.md) | S3 with presigned URLs for patient records | Accepted |
| [006](./006-hipaa-audit-log-design.md) | Audit log design for HIPAA compliance | Accepted |
| [007](./007-patient-code-no-phi-in-urls.md) | Opaque patient codes to avoid PHI in URLs | Accepted |
| [008](./008-custom-ui-components.md) | Custom minimal UI components over full shadcn install | Accepted |
| [009](./009-docker-standalone-output.md) | Docker with Next.js standalone output for cloud deployment | Accepted |
