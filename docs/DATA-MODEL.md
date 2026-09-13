# QualityOne regulated data foundation

## Tenant boundary
Every regulated business record belongs to a Tenant. Tenant identifiers are carried through application services and must be included in authorization and query boundaries. Global `User` identity is separated from tenant `Membership` so one person can later participate in more than one organization without merging regulated records.

## Identity and authorization
`Membership` connects User, Tenant, Department and JobRole. RBAC uses Role, Permission, MembershipRole and RolePermission. Authorization is deny-by-default.

## Auditability
`AuditEvent` is append-oriented and hash chained using `prevHash` and `eventHash`. Application roles receive no update/delete capability for audit events. Database-level immutability controls will be added in migrations and validated separately.

## Electronic signatures
`ElectronicSignature` stores signer identity, meaning, statement, target record, time and signed content hash. Re-authentication/identity verification is an application workflow concern and must occur before signature creation.

## Controlled documents
Document identity is separate from immutable DocumentVersion records. Approved/effective content is addressed by content hash and storage key. Superseded versions remain retained.

## Learning and qualification
Curriculum is versioned and can map to a JobRole. Assignments represent required training; Qualification represents current readiness/authorization state. Later releases will add assessments, OJT observations, competency evidence and retraining impact rules.

## Validation position
These structures are designed for validation readiness; their existence alone does not make the platform compliant with 21 CFR Part 11, Annex 11 or GxP. Validation evidence, procedural controls, security controls and intended-use testing remain required.
