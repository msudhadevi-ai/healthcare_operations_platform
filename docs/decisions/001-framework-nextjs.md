# ADR-001: Use Next.js as the full-stack framework

**Date:** 2026-06-02
**Status:** Accepted

## Context

The project is a multi-module SaaS application for eye clinics covering pharmacy inventory, front-desk operations, and clinical discharge summaries. Requirements include:
- Fast initial prototyping for a single developer or small team
- HIPAA-compliant architecture
- Cloud-deployable with room to scale
- Handles both structured data and binary patient records (images, PDFs)

The primary options considered were:
1. **React + Node.js/Express (separate frontend and backend)**
2. **Next.js (unified full-stack)**
3. **React + Python FastAPI backend**

## Decision

Use **Next.js 15** (App Router) as the single framework for both frontend and API.

## Rationale

- **Prototyping speed**: No CORS configuration, no separate servers to run, no deployment coordination between two repos. API routes live alongside pages.
- **App Router** enables per-route server-side logic (middleware, server components) which simplifies HIPAA concerns like server-side session validation — PHI never touches the browser in API responses where it can be avoided.
- **Single deployment unit**: One Docker image, one build process, one set of environment variables.
- **TypeScript throughout**: Shared types between API route handlers and UI components without a separate package.

## Consequences

- API is tightly coupled to the frontend deployment. If the API needs to be consumed by a mobile app or third-party later, the `/api/*` routes are accessible but not independently deployable without extracting them.
- Next.js API routes are not suited for long-running background jobs (e.g. processing large DICOM files). Those would need a separate worker service when that use case arises.
- Python was not chosen, which defers AI/ML image analysis integrations. When that need arises, the API routes can call an external Python microservice or AWS SageMaker endpoint.
