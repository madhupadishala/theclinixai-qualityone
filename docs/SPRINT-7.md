# Sprint 7 — Hardening, Validation, UAT & Production Readiness

## Objective
Turn QualityOne from a feature-complete codebase into a controlled, testable, deployment-ready regulated application baseline.

## Controls implemented in this sprint
- Tenant-serialized hash-chain audit writes using PostgreSQL advisory transaction locks.
- Controlled document creation/revision now uses the same audit helper as other regulated actions.
- Reviewer/approver segregation of duties for controlled document approval.
- Duplicate document approval prevention.
- Database immutability triggers for AuditEvent, ElectronicSignature, and TrainingRecord.
- Automated regulated-policy tests added to CI.
- CI gate now requires typecheck + policy tests + production build.

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

## Validation position
QualityOne is designed for Part 11 / Annex 11 validation readiness. Sprint 7 does not itself establish regulatory compliance. Compliance requires validated intended use, approved procedures, controlled infrastructure, access administration, training, testing evidence, and operational governance.

## External prerequisites still required
- Managed PostgreSQL provisioned.
- Initial Prisma migration generated/applied to DEV.
- Controlled immutability SQL applied after migration.
- Vercel project connected to `madhupadishala/theclinixai-qualityone`.
- DEV/UAT/PROD environment variables configured.
- UAT tenant/users/roles/permissions seeded.
- Identity provider or equivalent reauthentication mechanism selected for full regulated electronic-signature step-up.
