# Sprint 7 — Hardening, Validation, UAT & Production Readiness

## Objective
Turn QualityOne from a feature-complete codebase into a controlled, testable, deployment-ready regulated application baseline.

## Controls implemented in this sprint
- Sprint 6 exact-head CI verified green before Sprint 7 changes.
- Tenant-serialized hash-chain audit writes using PostgreSQL advisory transaction locks.
- Deterministic canonical JSON hashing for audit evidence.
- Controlled document creation/revision now uses the same audit helper as other regulated actions.
- Reviewer/approver segregation of duties for controlled document approval.
- Duplicate document approval prevention.
- Database immutability triggers for AuditEvent, ElectronicSignature, and TrainingRecord.
- Automated regulated-policy tests added to CI.
- CI gate now requires typecheck + policy tests + production build.
- Baseline permission catalog added as controlled SQL at `prisma/sql/seed_permissions.sql`.
- Validation traceability baseline maintained in the repository.

## UAT critical paths
1. SOP: create → submit → independent review → independent approval → effective.
2. Training: effective SOP → curriculum → assignment → acknowledgement/e-signature → completion.
3. Qualification: training + knowledge + practical evidence + SME sign-off → QUALIFIED.
4. QMS: deviation → investigation → RCA → CAPA → effectiveness → signed closure.
5. Integrated change: CAPA → SOP revision → affected-user retraining → effectiveness → closure.
6. PV competency: supervised cases + QC thresholds + client/database profile → qualification/risk state.
7. Tenant isolation: tenant A cannot read/write tenant B regulated records.
8. Authorization: missing permission is deny-by-default.
9. Audit evidence: every regulated action has actor/time/entity/action/hash predecessor evidence.
10. Immutability: audit, signature, and completed training evidence cannot be updated/deleted at DB level.

## DEV release gate
A release candidate is not eligible for UAT until this vertical path passes in DEV:

1. Active user authenticates into the correct tenant.
2. Author creates SOP v1.
3. Reviewer signs review.
4. A different approver signs approval.
5. SOP becomes effective.
6. Training is assigned to an eligible learner.
7. Learner acknowledges the exact effective SOP version.
8. TrainingRecord and ElectronicSignature evidence exist.
9. Qualification evidence is evaluated.
10. QA opens a deviation and records investigation/RCA/CAPA.
11. CAPA plans SOP impact.
12. SOP revision becomes effective and impacted-user retraining is generated.
13. CAPA effectiveness is blocked until retraining is completed.
14. Deviation closure is blocked until all required evidence is complete.
15. Audit history traces the full chain.

## Environment contract
### DEV
- Source branch: `develop`
- Suggested host: `quality-dev.theclinixai.com`
- Purpose: integration, migration verification and controlled smoke testing.

### UAT
- Suggested host: `quality-uat.theclinixai.com`
- Purpose: formal QA/business acceptance testing using representative non-production data.

### Production
- Source branch: `main`
- Suggested host: `quality.theclinixai.com`
- Purpose: controlled use after approved UAT and release evidence.

## Validation position
QualityOne is designed for Part 11 / Annex 11 validation readiness. Sprint 7 does not itself establish regulatory compliance. Compliance requires validated intended use, approved procedures, controlled infrastructure, access administration, training, testing evidence, operational governance, backup/restore, time synchronization, and release controls.

## External prerequisites still required
- Managed PostgreSQL provisioned.
- Initial Prisma migration generated and reviewed against DEV.
- Controlled immutability SQL applied after migration.
- Baseline permissions seeded using `prisma/sql/seed_permissions.sql`.
- Vercel project connected specifically to `madhupadishala/theclinixai-qualityone`.
- DEV/UAT/PROD environment variables configured without committing secrets.
- UAT tenant/users/roles/permission grants seeded.
- Identity provider or equivalent reauthentication mechanism selected for full regulated electronic-signature step-up.

## Current deployment blocker
The connected Vercel account currently has older QMS projects linked to other repositories, but no project linked to `madhupadishala/theclinixai-qualityone`. Those older projects must not be reused as the QualityOne release target.
