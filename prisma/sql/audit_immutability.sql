-- QualityOne controlled SQL: AuditEvent immutability
-- Apply after the initial Prisma migration creates the "AuditEvent" table.

CREATE OR REPLACE FUNCTION qualityone_prevent_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent rows are immutable; updates and deletes are prohibited';
END;
$$;

DROP TRIGGER IF EXISTS audit_event_immutable ON "AuditEvent";

CREATE TRIGGER audit_event_immutable
BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW
EXECUTE FUNCTION qualityone_prevent_audit_mutation();

COMMENT ON FUNCTION qualityone_prevent_audit_mutation() IS
'QualityOne control: prevents UPDATE/DELETE of audit trail rows.';
