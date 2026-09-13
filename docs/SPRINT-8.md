# Sprint 8 — Enterprise UX & Reporting

## Objective
Turn the regulated workflows implemented in Sprints 1–7 into an enterprise QA/manager experience with tenant-scoped operational reporting and inspection-ready evidence views.

## Implemented
- Enterprise Control Center at `/enterprise`.
- Executive KPIs across active workforce, controlled documents, training, deviations, CAPAs and qualifications.
- Training compliance matrix with learner, role, department, completion, overdue and compliance rate.
- CAPA aging report with age, due date, overdue days, owner and linked deviation severity.
- Qualification heatmap across QUALIFIED, IN_PROGRESS, AT_RISK, EXPIRED and SUSPENDED states.
- Inspection evidence snapshot including bounded audit events, electronic signatures, training records, deviations and CAPAs.
- Permission-controlled reporting APIs under `/api/reporting/*`.
- Controlled CSV export foundations for training, CAPA aging and qualifications.
- Dedicated RBAC permission `reporting.read`.
- QualityOne home navigation updated to reflect all implemented modules.

## API surface
- `GET /api/reporting/dashboard`
- `GET /api/reporting/training`
- `GET /api/reporting/capas`
- `GET /api/reporting/qualifications`
- `GET /api/reporting/inspection`
- `GET /api/reporting/export/training`
- `GET /api/reporting/export/capas`
- `GET /api/reporting/export/qualifications`

## Reporting controls
- Every report is tenant-scoped server-side.
- Reporting requires `reporting.read`; no client-provided tenant is trusted.
- CSV and inspection responses use controlled server-side datasets, not arbitrary queries.
- Inspection snapshot result sizes are bounded to avoid uncontrolled full-database extraction.
- Reporting endpoints are no-store by default where a downloadable artifact is returned.

## UAT scenarios
1. A user without `reporting.read` receives 403 for all reporting endpoints.
2. Tenant A dashboard contains no Tenant B data.
3. Training compliance accurately reflects completed and overdue assignments.
4. CAPA aging excludes CLOSED/CANCELLED CAPAs and flags overdue records.
5. Qualification heatmap reflects current persisted qualification state.
6. Inspection snapshot includes audit, signature, training, deviation and CAPA evidence counts.
7. CSV exports escape commas, quotes and JSON values correctly.
8. Enterprise dashboard renders gracefully with zero records.
9. Executive KPI values agree with underlying detailed reports.
10. Reporting does not mutate regulated records.

## Explicit non-claims
Sprint 8 adds operational and inspection-oriented views. It does not replace validated source records, create a regulator-certified report format, or establish Part 11/Annex 11 compliance by itself.

## Next hardening items
- PDF evidence-pack rendering with signature manifestation.
- Saved report filters and controlled report definitions.
- Scheduled report generation after production infrastructure exists.
- Drill-down screens for employee, CAPA and qualification evidence chains.
- Visual accessibility review and responsive UAT on production-like data.
