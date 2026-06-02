# ADR-005: S3 with presigned URLs for patient records

**Date:** 2026-06-02
**Status:** Accepted

## Context

Patient records include medical images (X-rays, ultrasounds, fundus photos, OCT scans), PDFs, and other binary files. These files:
- Can be large (DICOM files can exceed 50–100 MB)
- Are PHI and must be encrypted at rest and in transit
- Must be access-controlled (only authorized users of the correct clinic)
- May be in any file format

Options considered:
1. **Stream uploads through the Next.js server** — simple, but creates memory pressure and bandwidth costs on the API server
2. **Store files in PostgreSQL (bytea or large objects)** — poor performance for large files, bloats the database
3. **Direct-to-S3 upload via presigned URLs** — files never touch the application server

## Decision

Use **AWS S3 with server-generated presigned URLs** for both upload and download. Files are stored with **server-side AES-256 encryption** (`ServerSideEncryption: "AES256"`). The `s3Key` is stored in the `PatientRecord` table but never sent to the client.

**Upload flow (3 steps):**
1. Client requests a presigned PUT URL from `POST /api/records/upload-url` — server generates a 5-minute URL
2. Client uploads the file directly to S3 using that URL
3. Client confirms the upload via `POST /api/records`, which saves metadata (including `s3Key`) to the database

**Download flow:**
- `GET /api/records` generates a fresh 5-minute presigned GET URL per record. The `s3Key` is never included in the response — only the temporary signed URL.

## Rationale

- **No file proxying**: The API server handles only small JSON payloads. Large files go directly between the client and S3, keeping API server memory and bandwidth usage low.
- **HIPAA encryption at rest**: S3 server-side encryption (`SSE-S3`) is enabled on every upload. The S3 bucket must also be configured with: block all public access, versioning enabled, and a bucket policy denying unencrypted uploads.
- **Short-lived URLs (5 minutes)**: Presigned URLs cannot be revoked, so keeping them short-lived limits the exposure window if a URL is leaked.
- **`s3Key` never exposed**: S3 keys follow the pattern `clinics/{clinicId}/patients/{patientId}/{uuid}.{ext}`. Even though the key encodes structural information, it is kept server-side to prevent enumeration and to allow the key structure to change without breaking clients.

## Consequences

- The 5-minute upload window may be insufficient for very large files on slow connections. The expiry in `src/lib/s3.ts` (`PRESIGNED_URL_EXPIRES`) can be increased if upload failures are reported.
- S3 bucket configuration (public access block, encryption policy, versioning, lifecycle rules for expiry) must be set up manually or via IaC (e.g. Terraform) — it is not handled by the application code.
- For HIPAA compliance, a **Business Associate Agreement (BAA)** must be signed with AWS before storing PHI in S3.
- DICOM files are stored as opaque blobs. If in-browser DICOM viewing is needed, a DICOM-to-JPEG/PNG conversion step or a JS DICOM viewer library (e.g. `cornerstone.js`) would need to be added.
