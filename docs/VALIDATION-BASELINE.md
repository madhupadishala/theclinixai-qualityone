# Sprint 0 validation-ready baseline

## Intended use
QualityOne foundation for controlled quality documents, learning, qualification and later QMS workflows.

## Baseline controls
- tenant-scoped regulated data model
- server-side membership resolution
- deny-by-default RBAC
- append-oriented hash-chained audit events
- electronic-signature evidence model
- immutable document-version concept
- controlled environment variables and secret handling
- CI typecheck/build gate
- DEV/UAT/PROD separation design

## Evidence required before Sprint 0 closure
1. CI green on Sprint 0 head commit.
2. Managed DEV database provisioned and initial migration applied.
3. DEV Vercel deployment created from `develop`.
4. `/api/health` returns 200.
5. `/api/session` returns 401 without a valid session.
6. Tenant authorization smoke test recorded.
7. Release baseline commit recorded.

This document records validation readiness only and is not a declaration of regulatory compliance.
