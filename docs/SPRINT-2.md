# Sprint 2 — Learning core

## Vertical slice
Effective controlled document version → curriculum → role/user assignment → learner acknowledgement → immutable TrainingRecord → completion → manager compliance.

## Implemented
- Role-linked curricula
- Curriculum items bound to exact effective DocumentVersion
- Assignment by job role or explicit membership
- Due dates and overdue derivation
- My Training API
- Read & Understand acknowledgement with electronic signature
- TrainingRecord evidence containing document version + content hash
- Assignment completion only when all required items are complete
- Tenant-wide compliance summary and learner-level status
- Learning landing page

## Permission codes
- training.curricula.manage
- training.assign
- training.my.read
- training.complete
- training.compliance.read

## Validation scenarios
1. Non-effective documents cannot enter a curriculum.
2. Curriculum stores the exact DocumentVersion required at assignment time.
3. A learner cannot complete another membership's assignment.
4. Acknowledgement creates signature + TrainingRecord tied to the content hash.
5. Duplicate completion of one curriculum item is blocked.
6. Assignment is COMPLETED only when every required item is complete.
7. Past-due open assignments appear as OVERDUE.
8. Cross-tenant role, learner and curriculum access is rejected by tenant-scoped service queries.

## Sprint 5 hook
When a new SOP version becomes effective, the old TrainingRecord remains valid evidence of historical training. The impact engine can compare required DocumentVersion IDs and issue retraining against the new version.
