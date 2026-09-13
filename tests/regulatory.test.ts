import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAuditHash } from '../lib/audit';
import { assertSegregationOfDuties, deriveQualificationRisk } from '../lib/regulatory';

test('audit hash is deterministic for equivalent payload ordering', () => {
  const occurredAt = new Date('2026-09-13T12:00:00.000Z');
  const a = computeAuditHash({ tenantId: 't1', action: 'X', entityType: 'Document', entityId: 'd1', after: { b: 2, a: 1 } }, occurredAt, 'prev');
  const b = computeAuditHash({ tenantId: 't1', action: 'X', entityType: 'Document', entityId: 'd1', after: { a: 1, b: 2 } }, occurredAt, 'prev');
  assert.equal(a, b);
});

test('reviewer cannot approve the same controlled document version', () => {
  assert.throws(() => assertSegregationOfDuties('user-1', 'user-1'), /SEGREGATION_OF_DUTIES_REQUIRED/);
  assert.doesNotThrow(() => assertSegregationOfDuties('user-1', 'user-2'));
});

test('qualified user risk transitions are conservative', () => {
  assert.equal(deriveQualificationRisk({ wasQualified: true, criticalFailure: true, requirementsMet: false }), 'SUSPENDED');
  assert.equal(deriveQualificationRisk({ wasQualified: true, criticalFailure: false, requirementsMet: false }), 'AT_RISK');
  assert.equal(deriveQualificationRisk({ wasQualified: true, criticalFailure: false, requirementsMet: true }), 'QUALIFIED');
  assert.equal(deriveQualificationRisk({ wasQualified: false, criticalFailure: false, requirementsMet: true }), 'IN_PROGRESS');
});
