# ADR-007: Opaque patient codes to avoid PHI in URLs

**Date:** 2026-06-02
**Status:** Accepted

## Context

HIPAA prohibits PHI from appearing in URLs, request logs, browser history, or server access logs. Patient identifiers used in URLs must not constitute PHI. The patient's database primary key (a CUID like `clxyz123...`) is opaque but is an internal identifier that could leak the creation timestamp. The patient's name, date of birth, or medical record number are clearly PHI and cannot be in a URL.

## Decision

Each patient gets a **sequential, human-readable `patientCode`** generated at registration time (e.g. `PT-00001`, `PT-00042`). This code:
- Is unique within a clinic (`@@unique([clinicId, patientCode])`)
- Is used as the display identifier in the UI and in search
- Is safe to appear in URLs and logs — it carries no PHI
- Is generated server-side in `src/lib/utils.ts` (`generatePatientCode`)

The format is `PT-{5-digit zero-padded number}` based on the count of existing patients in the clinic.

## Rationale

- A patient code like `PT-00042` cannot be used to identify a specific person without access to the database.
- Human-readable codes are useful in clinical workflows: staff can reference a patient by code on paper, in phone calls, or in printed receipts without stating the patient's name.
- Sequential codes make it easy to spot data gaps or detect if records have been deleted.

## Consequences

- The count-based generation (`SELECT COUNT(*) + 1`) has a race condition: two simultaneous registrations could generate the same code. Mitigation options: use a `SELECT FOR UPDATE` lock, a PostgreSQL sequence, or retry on unique constraint violation. For the current single-server prototype, this is unlikely to matter.
- Codes are clinic-scoped, not globally unique. `PT-00001` exists in every clinic. References across clinics (e.g. referral letters) must include the clinic identifier.
- Patient codes are sequential, which reveals the approximate total patient count to anyone who can register a patient. This is acceptable for a clinic management tool.
