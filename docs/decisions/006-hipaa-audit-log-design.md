# ADR-006: Audit log design for HIPAA compliance

**Date:** 2026-06-02
**Status:** Accepted

## Context

HIPAA's Security Rule (45 CFR § 164.312(b)) requires audit controls — hardware, software, and procedural mechanisms that record and examine activity in systems containing PHI. Every access to or modification of PHI must be traceable to a user, timestamp, and action.

Design questions:
- Where to store audit logs?
- What data to include?
- How to handle audit log write failures?
- How to prevent log tampering?

## Decision

Audit logs are stored in the **`AuditLog` table in PostgreSQL**, co-located with application data. Each log entry records:

| Field | Value |
|---|---|
| `clinicId` | Tenant scope |
| `userId` | Who performed the action (nullable for unauthenticated attempts) |
| `action` | Enum: `CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, UPLOAD` |
| `resource` | Model name (e.g. `Patient`, `DischargeSummary`) |
| `resourceId` | The ID of the affected record |
| `ipAddress` | Extracted from `x-forwarded-for` or `x-real-ip` headers |
| `userAgent` | Browser/client identifier |
| `details` | JSON string with non-PHI metadata only (e.g. `{ count: 10 }`) |
| `timestamp` | UTC timestamp, indexed |

The `writeAuditLog` function in `src/lib/audit.ts` is fire-and-forget: failures are logged to `console.error` but do not throw or cause the parent request to fail.

**Critical constraint**: The `details` field must never contain raw PHI (patient names, dates of birth, diagnoses, etc.) — only opaque IDs and non-identifying metadata.

## Rationale

- **PostgreSQL over a separate log store**: At this scale, a separate logging service (e.g. AWS CloudWatch, Datadog) adds operational complexity. PostgreSQL with indexed `timestamp` and `clinicId` columns handles querying audit history adequately. Migration to a dedicated SIEM is straightforward when needed.
- **Non-blocking writes**: A failing audit log write should not cause a patient registration or discharge summary save to fail. The consequence of a missed log entry is preferable to a crashed user operation. In production, audit log failures should trigger an alert.
- **No PHI in details**: If a log aggregation service or unauthorized party gains read access to the audit log, they should not be able to reconstruct PHI from it. The `resourceId` is an opaque CUID — correlating it to patient data requires access to the main tables.

## Consequences

- Audit logs accumulate indefinitely. A retention policy (e.g. 6 years per HIPAA requirement) and archival strategy must be implemented. Consider a scheduled job to archive records older than the retention window to cold storage (e.g. S3 Glacier).
- The audit log table will become one of the largest tables over time. The indexes on `clinicId` and `timestamp` are essential for query performance. Partitioning by month can be added when the table grows large.
- Audit log writes are not transactional with the main operation. In a scenario where the main write succeeds but the audit write fails silently, there is an undetected gap in the audit trail. A more robust approach would use PostgreSQL triggers or a transactional outbox pattern.
