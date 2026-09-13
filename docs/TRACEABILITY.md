# QualityOne Validation Traceability Baseline

| ID | User Requirement | Functional Control | Evidence / Test |
|---|---|---|---|
| URS-001 | Users shall access only authorized tenant data. | Session tenant + active membership + server-side permission checks. | UAT-07 tenant isolation; authorization tests. |
| URS-002 | Controlled documents shall follow a governed lifecycle. | Draft → Review → Approval → Effective → Revision/Retirement. | UAT-01. |
| URS-003 | Reviewer and approver shall be independently identifiable. | Separate REVIEW and APPROVAL signatures; reviewer cannot approve same version. | Policy test + UAT-01. |
| URS-004 | Regulated actions shall be audit trailed. | Per-tenant hash-chain AuditEvent records. | Audit hash test + UAT-09. |
| URS-005 | Audit records shall not be editable or deletable. | PostgreSQL immutability trigger. | UAT-10. |
| URS-006 | Electronic signatures shall remain linked to exact evidence. | Signature entity ID + meaning + statement + contentHash. | UAT-01/02/03/04. |
| URS-007 | Completed training shall prove exact SOP version trained. | TrainingRecord references immutable DocumentVersion and signature. | UAT-02. |
| URS-008 | SOP revision shall trigger targeted retraining when linked to CAPA impact. | Impact plan + effective-version orchestration + dedicated retraining curriculum. | UAT-05. |
| URS-009 | CAPA/deviation closure shall be blocked when required retraining is incomplete. | Integration closure/effectiveness gates. | UAT-05. |
| URS-010 | Qualification shall require configured knowledge/practical/training criteria. | QualificationRule + assessment + practical evidence + SME sign-off. | UAT-03. |
| URS-011 | PV qualification shall support competency, client, database and QC thresholds. | PV profile configuration + practical observations + evidence aggregation. | UAT-06. |
| URS-012 | Critical post-qualification competency failure shall suspend qualification. | PV risk-state evaluation. | Policy test + UAT-06. |

## Open validation gaps
- Full database-backed integration test suite requires managed PostgreSQL.
- Full electronic-signature reauthentication requires the production identity mechanism; current signatures establish signed session identity and evidence linkage but do not yet provide independent credential re-entry.
- Production backup/restore, disaster recovery, monitoring, and release rollback evidence must be captured in the deployed environments.
