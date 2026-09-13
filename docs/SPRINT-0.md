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
- [x] Health endpoint
- [x] Deployment and security baselines documented

## Remaining before Sprint 0 exit
- [ ] Create managed DEV PostgreSQL and apply first controlled migration
- [ ] Connect GitHub repository to Vercel
- [ ] Configure DEV environment variables
- [ ] Deploy and smoke-test DEV
- [ ] Establish UAT project/environment path
- [ ] Add production database immutability controls for AuditEvent
- [ ] Implement authentication provider and verified session boundary
- [ ] Record first release/validation baseline

## Rule
No patient/safety production data is permitted in DEV or UAT.
