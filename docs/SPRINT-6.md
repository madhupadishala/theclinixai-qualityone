# Sprint 6 — PV Competency Engine

## Objective
Add a PV-native competency layer to QualityOne without creating a parallel qualification system.

## Implemented design
- Controlled PV qualification profiles are versioned through immutable audit events.
- Profiles are linked to an existing curriculum and may be restricted by client and/or safety database.
- Competency requirements specify minimum supervised case count, minimum QC score and whether the competency is critical.
- Practical evidence reuses `PracticalObservation` and the existing qualification engine.
- Final qualification reuses the existing `Qualification`, evidence snapshot and electronic signature controls.

## Standard competency library
- Safety Intake
- Case Triage
- ICSR Case Processing
- MedDRA Coding
- Literature Screening
- Narrative Writing
- Case Follow-up
- Safety Submission
- Case Quality Control
- Medical Review
- Aggregate Reporting
- Signal Management

## Core flow
PV profile -> training curriculum -> assessment -> supervised case evidence -> PV evaluation -> SME sign-off -> QUALIFIED.

## Status rules
- IN_PROGRESS: base or PV competency evidence is incomplete.
- QUALIFIED: base qualification is signed off and all PV competency thresholds pass.
- AT_RISK: a previously qualified user no longer meets one or more non-critical PV requirements.
- SUSPENDED: a previously qualified user has a current critical competency failure.

## Validation scenarios
1. Reject profile creation for unknown curriculum.
2. Reject duplicate competency codes in one profile.
3. Version profile configuration changes instead of overwriting prior evidence.
4. Reject evidence for competency not in the selected profile.
5. Reject evidence when configured client context does not match.
6. Reject evidence when configured safety database does not match.
7. Aggregate supervised case count across multiple observations.
8. Calculate weighted QC score by observed case count.
9. Keep qualification IN_PROGRESS until each required competency reaches both case-count and QC thresholds.
10. Require existing training/knowledge/practical qualification evidence and SME sign-off.
11. Set AT_RISK when a qualified user's current non-critical competency profile is no longer satisfied.
12. Set SUSPENDED when a critical competency records a failing current observation after qualification.
13. Do not place patient identifiers or safety-case payloads in PV qualification evidence; store only controlled evidence references and metrics.
14. Preserve tenant boundaries for profiles, assignments, evidence and qualification records.

## Permissions
- `pv.profiles.read`
- `pv.profiles.manage`
- `pv.evidence.record`
- `pv.qualifications.evaluate`
- `pv.qualifications.signoff`

## API
- `GET/POST /api/pv/profiles`
- `POST /api/pv/evidence`
- `POST /api/pv/qualifications/{membershipId}/{curriculumId}`

## Compliance position
Sprint 6 provides controlled PV competency and qualification logic. It does not independently establish validated GxP or Part 11 compliance; operational validation, procedural controls, access provisioning, migration control and release evidence remain required.
