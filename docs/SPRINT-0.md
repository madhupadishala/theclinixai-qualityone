# Sprint 0 — Foundation

## Implemented
- [x] Next.js + React + TypeScript application shell
- [x] Environment validation contract
- [x] GitHub Actions CI
- [x] PostgreSQL + Prisma schema foundation
- [x] Tenant and Organization models
- [x] User, Membership, Department and JobRole models
- [x] RBAC data model and permission checker
- [x] Hash-chained append-oriented AuditEvent
- [x] ElectronicSignature evidence model
- [x] Document and immutable DocumentVersion foundation
- [x] Curriculum, TrainingAssignment and Qualification foundations
- [x] Provider-independent signed session boundary
- [x] Server-side active-membership enforcement
- [x] Health endpoint and unauthenticated session endpoint behavior
- [x] Deployment, security and validation baselines documented

## Remaining before Sprint 0 exit
- [ ] Create managed DEV PostgreSQL and apply first controlled migration
- [ ] Connect this repository to a new Vercel project
- [ ] Configure DEV environment variables
- [ ] Deploy and smoke-test DEV
- [ ] Establish UAT path
- [ ] Add DB-level AuditEvent update/delete prevention in controlled migration
- [ ] Record first release baseline

## Rule
No patient/safety production data is permitted in DEV or UAT.
