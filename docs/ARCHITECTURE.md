# QualityOne architecture — Sprint 0

## Principles

1. One integrated product, not separate QMS and LMS applications.
2. Multi-tenancy is a server-side data-boundary concern from day one.
3. Identity, permissions, workflow state, signatures and audit history are shared platform primitives.
4. Regulated records are append-safe and traceable; mutable UI state must never erase historical evidence.
5. DEV, UAT and PROD are separate deployment environments.
6. External open-source code enters the product only after license and security review.

## Planned layers

- Web: Next.js App Router + React + TypeScript
- Domain/API: server-side application services and route handlers
- Data: PostgreSQL
- ORM/migrations: Prisma
- Files: S3-compatible object storage
- Hosting: Vercel application layer
- CI: GitHub Actions

## Environment path

feature branch -> preview -> develop -> UAT -> main -> production

## Sprint 0 protected IP boundary

The detailed regulated domain model, workflow rule definitions, PV qualification logic and audit/e-signature implementation are intentionally held until repository visibility is private.
