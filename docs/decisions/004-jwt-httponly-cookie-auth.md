# ADR-004: JWT in httpOnly cookies for session management

**Date:** 2026-06-02
**Status:** Accepted

## Context

The application handles Protected Health Information (PHI). Authentication must meet HIPAA requirements including:
- Session timeout (automatic logout after inactivity)
- Prevention of session hijacking
- Audit trail of login and logout events

Options considered:
1. **JWT in `localStorage`** — accessible to JavaScript, vulnerable to XSS
2. **JWT in `httpOnly` cookie** — not accessible to JavaScript, mitigates XSS
3. **Database-backed sessions** (e.g. NextAuth with session table) — fully revocable, more overhead
4. **Third-party auth (Auth0, AWS Cognito)** — HIPAA BAA available, adds cost and vendor dependency

## Decision

Use **JWT stored in an `httpOnly`, `secure`, `sameSite: lax` cookie** with an **8-hour expiry**.

Session validation happens in `src/middleware.ts` on every request. Login/logout events are written to the audit log.

## Rationale

- **`httpOnly`** prevents JavaScript from reading the token, eliminating the primary XSS attack vector for session theft.
- **8-hour expiry** satisfies HIPAA's automatic session timeout requirement for PHI access systems. The value aligns with a typical clinic workday.
- **JWT (stateless)** avoids a database round-trip on every request for session validation — the middleware verifies the signature locally. This is acceptable because the session lifetime is short and immediate revocation (e.g. on password change) can be added later by maintaining a revocation list.
- **Third-party auth was deferred**: Auth0 and Cognito both offer HIPAA BAAs, but introduce vendor lock-in and per-MAU costs that are premature for the prototyping stage. The current implementation can be replaced without changes to the UI layer.

## Consequences

- JWT tokens cannot be revoked before expiry without adding a deny-list (e.g. a Redis set of invalidated `jti` claims). If a user account is deactivated mid-session, their token remains valid until expiry. Mitigation: the `isActive` check on the `User` record can be added to the middleware for sensitive operations.
- `sameSite: lax` allows the cookie to be sent on top-level navigations from external links (e.g. email links into the app), but not on cross-site sub-resource requests. `strict` was considered but breaks OAuth redirect flows if those are added later.
- MFA is modeled in the schema (`mfaEnabled`, `mfaSecret` on `User`) but not yet implemented in the login flow. The login API route has a placeholder where TOTP verification should be inserted.
