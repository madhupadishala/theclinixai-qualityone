import { createHash } from 'node:crypto';
import { db } from './db';
import { appendAuditEvent } from './audit';

type Actor = { tenantId: string; userId: string; membershipId: string };

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export async function listDeviations(tenantId: string) {
  return db.deviation.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: { department: true, owner: { select: { id: true, displayName: true, email: true } }, capas: true },
  });
}

export async function getDeviation(tenantId: string, id: string) {
  return db.deviation.findFirst({
    where: { tenantId, id },
    include: {
      department: true,
      owner: { select: { id: true, displayName: true, email: true } },
      investigation: true,
      rootCauseAnalysis: true,
      capas: { include: { effectivenessChecks: true, owner: { select: { id: true, displayName: true, email: true } } } },
      closureSignature: true,
    },
  });
}

export async function createDeviation(actor: Actor, input: { deviationNumber: string; title: string; description: string; severity: 'MINOR' | 'MAJOR' | 'CRITICAL'; departmentId?: string; ownerUserId: string; discoveredAt: Date; dueAt?: Date; immediateAction?: string }) {
  const deviation = await db.deviation.create({ data: { tenantId: actor.tenantId, ...input } });
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'DEVIATION_OPENED', entityType: 'Deviation', entityId: deviation.id, after: { deviationNumber: deviation.deviationNumber, severity: deviation.severity, status: deviation.status } });
  return deviation;
}

export async function recordInvestigation(actor: Actor, deviationId: string, input: { scope: string; facts: string; impactAssessment?: string; evidence?: unknown; complete?: boolean }) {
  const deviation = await getDeviation(actor.tenantId, deviationId);
  if (!deviation || ['CLOSED', 'VOID'].includes(deviation.status)) throw new Error('INVALID_DEVIATION_STATE');
  const investigation = await db.investigation.upsert({
    where: { deviationId },
    create: { deviationId, investigatorId: actor.userId, scope: input.scope, facts: input.facts, impactAssessment: input.impactAssessment, evidence: input.evidence as never, completedAt: input.complete ? new Date() : null },
    update: { investigatorId: actor.userId, scope: input.scope, facts: input.facts, impactAssessment: input.impactAssessment, evidence: input.evidence as never, completedAt: input.complete ? new Date() : null },
  });
  await db.deviation.update({ where: { id: deviationId }, data: { status: 'UNDER_INVESTIGATION' } });
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: input.complete ? 'INVESTIGATION_COMPLETED' : 'INVESTIGATION_UPDATED', entityType: 'Deviation', entityId: deviationId, after: { investigationId: investigation.id, completedAt: investigation.completedAt } });
  return investigation;
}

export async function recordRca(actor: Actor, deviationId: string, input: { category: 'PEOPLE' | 'PROCESS' | 'PROCEDURE' | 'TECHNOLOGY' | 'TRAINING' | 'MATERIAL' | 'ENVIRONMENT' | 'DATA' | 'OTHER'; rootCause: string; contributing?: string; method?: string; evidence?: unknown }) {
  const deviation = await getDeviation(actor.tenantId, deviationId);
  if (!deviation?.investigation?.completedAt) throw new Error('INVESTIGATION_REQUIRED');
  const rca = await db.rootCauseAnalysis.upsert({
    where: { deviationId },
    create: { deviationId, authorUserId: actor.userId, ...input, evidence: input.evidence as never },
    update: { authorUserId: actor.userId, ...input, evidence: input.evidence as never, completedAt: new Date() },
  });
  await db.deviation.update({ where: { id: deviationId }, data: { status: 'RCA_COMPLETED' } });
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'RCA_COMPLETED', entityType: 'Deviation', entityId: deviationId, after: { rcaId: rca.id, category: rca.category } });
  return rca;
}

export async function createCapa(actor: Actor, deviationId: string, input: { capaNumber: string; type: 'CORRECTIVE' | 'PREVENTIVE'; title: string; action: string; rationale?: string; ownerUserId: string; dueAt?: Date }) {
  const deviation = await getDeviation(actor.tenantId, deviationId);
  if (!deviation?.rootCauseAnalysis) throw new Error('RCA_REQUIRED');
  const capa = await db.capa.create({ data: { tenantId: actor.tenantId, deviationId, ...input } });
  await db.deviation.update({ where: { id: deviationId }, data: { status: 'CAPA_IN_PROGRESS' } });
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'CAPA_CREATED', entityType: 'Capa', entityId: capa.id, after: { deviationId, capaNumber: capa.capaNumber, type: capa.type } });
  return capa;
}

export async function updateCapa(actor: Actor, capaId: string, input: { status: 'OPEN' | 'IN_PROGRESS' | 'PENDING_VERIFICATION' | 'EFFECTIVE' | 'INEFFECTIVE' | 'CLOSED' | 'CANCELLED'; verificationSummary?: string }) {
  const capa = await db.capa.findFirst({ where: { id: capaId, tenantId: actor.tenantId } });
  if (!capa) throw new Error('NOT_FOUND');
  const completedAt = ['PENDING_VERIFICATION', 'EFFECTIVE', 'INEFFECTIVE', 'CLOSED'].includes(input.status) ? new Date() : capa.completedAt;
  const updated = await db.capa.update({ where: { id: capaId }, data: { status: input.status, verificationSummary: input.verificationSummary, completedAt } });
  if (input.status === 'PENDING_VERIFICATION') await db.deviation.update({ where: { id: capa.deviationId }, data: { status: 'EFFECTIVENESS_PENDING' } });
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'CAPA_STATUS_CHANGED', entityType: 'Capa', entityId: capaId, before: { status: capa.status }, after: { status: updated.status, completedAt } });
  return updated;
}

export async function recordEffectiveness(actor: Actor, capaId: string, input: { outcome: 'EFFECTIVE' | 'PARTIALLY_EFFECTIVE' | 'INEFFECTIVE'; evidence: string; notes?: string; plannedAt?: Date }) {
  const capa = await db.capa.findFirst({ where: { id: capaId, tenantId: actor.tenantId } });
  if (!capa || !['PENDING_VERIFICATION', 'EFFECTIVE', 'INEFFECTIVE'].includes(capa.status)) throw new Error('CAPA_NOT_READY_FOR_EFFECTIVENESS');
  const check = await db.effectivenessCheck.create({ data: { capaId, reviewerUserId: actor.userId, ...input } });
  const newStatus = input.outcome === 'EFFECTIVE' ? 'EFFECTIVE' : 'INEFFECTIVE';
  await db.capa.update({ where: { id: capaId }, data: { status: newStatus } });
  const siblings = await db.capa.findMany({ where: { deviationId: capa.deviationId } });
  const allReady = siblings.every((c) => c.id === capaId ? newStatus === 'EFFECTIVE' : c.status === 'EFFECTIVE');
  await db.deviation.update({ where: { id: capa.deviationId }, data: { status: allReady ? 'READY_FOR_CLOSURE' : 'EFFECTIVENESS_PENDING' } });
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'EFFECTIVENESS_CHECK_RECORDED', entityType: 'Capa', entityId: capaId, after: { checkId: check.id, outcome: check.outcome } });
  return check;
}

export async function closeDeviation(actor: Actor, deviationId: string, input: { closureSummary: string; statement: string }) {
  const deviation = await getDeviation(actor.tenantId, deviationId);
  if (!deviation || !deviation.investigation?.completedAt || !deviation.rootCauseAnalysis || deviation.capas.length === 0) throw new Error('CLOSURE_PREREQUISITES_NOT_MET');
  if (!deviation.capas.every((c) => c.status === 'EFFECTIVE' && c.effectivenessChecks.some((e) => e.outcome === 'EFFECTIVE'))) throw new Error('EFFECTIVENESS_REQUIRED');
  const snapshot = { deviationId, deviationNumber: deviation.deviationNumber, severity: deviation.severity, investigationId: deviation.investigation.id, rcaId: deviation.rootCauseAnalysis.id, capas: deviation.capas.map((c) => ({ id: c.id, status: c.status })) };
  const signature = await db.electronicSignature.create({ data: { userId: actor.userId, meaning: 'QMS_CLOSURE', entityType: 'Deviation', entityId: deviationId, statement: input.statement, contentHash: hash(snapshot) } });
  const updated = await db.deviation.update({ where: { id: deviationId }, data: { status: 'CLOSED', closedAt: new Date(), closureSummary: input.closureSummary, closureSignatureId: signature.id } });
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'DEVIATION_CLOSED', entityType: 'Deviation', entityId: deviationId, after: { status: 'CLOSED', signatureId: signature.id, snapshot } });
  return updated;
}
