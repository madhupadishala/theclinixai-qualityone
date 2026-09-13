# Sprint 5 — Integrated QMS + QualityDocs + Learning

## Vertical slice
Deviation → RCA identifies procedure/training gap → CAPA → affected SOP impact planned → SOP revised/reviewed/approved → revised version becomes effective → impacted learners detected → targeted retraining created → completion monitored → CAPA effectiveness → deviation closure.

## Implemented
- CAPA-to-document impact planning with durable audit evidence
- Impact snapshot captures the previously effective document version
- Automatic trigger from QualityDocs when a revised document becomes effective
- Impacted learner detection from historical curricula, assignments and role membership
- Historical curricula are not rewritten
- A dedicated one-document retraining curriculum is created for the new effective version
- Retraining assignments are created only for impacted active memberships
- Retraining due date is configurable per CAPA impact
- Retraining campaign and assignment events are audit-tracked
- CAPA integration status reports waiting, in-progress and complete states
- CAPA effectiveness is blocked while planned retraining is incomplete
- Direct CAPA EFFECTIVE/CLOSED status changes are also blocked while retraining is incomplete
- Deviation closure checks retraining completion across every linked CAPA
- Manual launch endpoint exists as an idempotent recovery path if an automatic trigger must be retried

## API
- `GET /api/capas/{id}/impact` — integration/retraining status
- `POST /api/capas/{id}/impact` with `action=plan` — bind an effective SOP version to a CAPA impact
- `POST /api/capas/{id}/impact` with `action=launch` — recovery/manual orchestration for an already-effective revision

## State model
1. CAPA impact planned against SOP v2 → `WAITING_FOR_EFFECTIVE_REVISION`.
2. SOP v3 goes through normal QualityDocs review/approval.
3. SOP v3 becomes effective.
4. QualityOne automatically identifies people affected by v2.
5. Targeted v3 retraining curriculum and assignments are created.
6. Campaign → `RETRAINING_IN_PROGRESS` until every assignment is completed.
7. Campaign → `COMPLETE` only when all required records exist.
8. CAPA effectiveness and deviation closure gates then unlock.

## Validation scenarios
1. Planning against a Draft/Approved-but-not-effective document is rejected.
2. Duplicate CAPA/document impact plans are rejected.
3. A planned impact without an effective revision blocks CAPA effectiveness.
4. Making the next approved SOP version effective creates no duplicate campaign on retry.
5. Historical curriculum items continue to point to the old version.
6. Retraining curriculum points only to the new effective version.
7. Affected learners include prior curriculum assignees and active members of affected job roles.
8. Incomplete retraining blocks both effectiveness recording and direct CAPA EFFECTIVE/CLOSED status changes.
9. Incomplete retraining on any CAPA blocks deviation closure.
10. Zero affected learners is a valid completed campaign with auditable zero-impact evidence.

## Validation position
This sprint provides software controls and traceability for integrated quality/training workflows. Production GxP use still requires intended-use validation, approved procedures, configured permissions, controlled infrastructure and documented test evidence.
