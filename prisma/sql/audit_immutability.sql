-- QualityOne controlled SQL: regulated evidence immutability
-- Apply after the initial Prisma migration creates the referenced tables.

CREATE OR REPLACE FUNCTION qualityone_prevent_regulated_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% rows are immutable; updates and deletes are prohibited', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS audit_event_immutable ON "AuditEvent";
CREATE TRIGGER audit_event_immutable
BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW
EXECUTE FUNCTION qualityone_prevent_regulated_mutation();

DROP TRIGGER IF EXISTS electronic_signature_immutable ON "ElectronicSignature";
CREATE TRIGGER electronic_signature_immutable
BEFORE UPDATE OR DELETE ON "ElectronicSignature"
FOR EACH ROW
EXECUTE FUNCTION qualityone_prevent_regulated_mutation();

DROP TRIGGER IF EXISTS training_record_immutable ON "TrainingRecord";
CREATE TRIGGER training_record_immutable
BEFORE UPDATE OR DELETE ON "TrainingRecord"
FOR EACH ROW
EXECUTE FUNCTION qualityone_prevent_regulated_mutation();

COMMENT ON FUNCTION qualityone_prevent_regulated_mutation() IS
'QualityOne control: prevents UPDATE/DELETE of regulated audit, electronic signature, and completed training evidence rows.';
