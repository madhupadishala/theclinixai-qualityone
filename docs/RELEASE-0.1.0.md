# QualityOne v0.1.0 — Sprint 0 baseline

## Scope
Foundation release for TheClinixAI QualityOne.

## Implemented
- Next.js/React/TypeScript application shell
- PostgreSQL/Prisma domain foundation
- Tenant, organization, membership, department and job-role model
- RBAC data model and server-side authorization boundary
- Hash-chained append-oriented audit events
- Controlled SQL to prohibit AuditEvent UPDATE/DELETE
- Electronic-signature evidence model
- Controlled document/version foundation
- Curriculum, training assignment and qualification foundations
- Signed HttpOnly session contract
- Health and session endpoints
- CI typecheck/build gate
- DEV/UAT/PROD deployment/security baseline documentation

## CI evidence
Sprint 0 head passed Prisma generation, TypeScript typecheck and Next.js production build in GitHub Actions on 2026-09-13.

## Security maintenance
Next.js is pinned to the patched 15.5 maintenance line used by this baseline. Secrets are environment-only.

## External prerequisites before deployment acceptance
- managed DEV PostgreSQL
- initial Prisma migration applied
- audit immutability SQL applied
- Vercel project linked to `madhupadishala/theclinixai-qualityone`
- environment variables configured
- DEV smoke test completed

## Regulatory position
This baseline is designed for validation readiness. It is not, by itself, a claim of 21 CFR Part 11, Annex 11 or GxP compliance.
