# Sprint 4 — Core QMS

## Vertical slice
Deviation → investigation → RCA → CAPA → effectiveness → signed closure.

## Implemented
- Deviation intake with severity, department, owner, due date and immediate action
- Controlled status lifecycle
- Investigation record with scope, facts, impact and evidence
- Root-cause analysis with categorized root cause and contributing factors
- Multiple CAPAs per deviation
- Corrective/preventive action ownership and due dates
- CAPA verification state
- Effectiveness checks with outcome and evidence
- Closure gate that requires completed investigation, RCA, CAPA and effective verification
- Electronic closure signature bound to a hashed evidence snapshot
- Audit events across lifecycle operations
- Tenant-scoped APIs and QMS permissions
- QMS workspace page

## Required permissions
- qms.deviations.read
- qms.deviations.create
- qms.investigate
- qms.rca
- qms.capa.create
- qms.capa.manage
- qms.effectiveness
- qms.close

## Validation scenarios
1. RCA is rejected until investigation is complete.
2. CAPA creation is rejected until RCA exists.
3. Effectiveness cannot be recorded before CAPA verification state.
4. Deviation closure is rejected while any CAPA lacks an EFFECTIVE effectiveness result.
5. Cross-tenant reads return no deviation.
6. Closure produces an electronic signature tied to a hash of the closing evidence snapshot.
7. Closed/void deviations reject investigation changes.

## Next integration
Sprint 5 links CAPA/root-cause outcomes to controlled SOP revisions, training impact and automatic retraining.
