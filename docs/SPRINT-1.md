# Sprint 1 — QualityDocs core

## Vertical slice
Create controlled document → submit for review → reviewer e-signature → approver e-signature → effective date → revision → retained history.

## Implemented
- Document listing and retrieval APIs
- Document creation with controlled version 1
- SHA-256 content hash per version
- Draft → In Review transition
- Review electronic signature bound to DocumentVersion + content hash
- Approval blocked until review evidence exists
- Approval electronic signature bound to DocumentVersion + content hash
- Approved → Effective transition and effective date
- Effective document revision creates next version and retains previous version
- Document retirement
- Tenant-scoped queries and permission checks
- Audit events for lifecycle actions
- QualityDocs landing page

## Required permission codes
- documents.read
- documents.create
- documents.submit_review
- documents.review
- documents.approve
- documents.make_effective
- documents.revise
- documents.retire

## Validation scenarios
1. A Draft cannot be made Effective.
2. Approval cannot occur before Review evidence exists.
3. Review/Approval signatures bind to the exact DocumentVersion content hash.
4. Cross-tenant document access returns no record.
5. Effective revision creates the next integer version and retains the previous version.
6. Retired documents cannot enter a normal lifecycle without an explicit future restore workflow.

## Known deployment dependency
Database-backed execution requires Sprint 0 managed PostgreSQL provisioning and migration application. The API and UI code are buildable independently.
