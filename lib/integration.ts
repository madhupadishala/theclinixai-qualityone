import { db } from './db';
import { appendAuditEvent } from './audit';

type Actor = { tenantId: string; userId: string; membershipId: string };

type ImpactMetadata = {
  capaId: string;
  documentId: string;
  fromVersionId: string;
  reason: string;
  dueDays: number;
};

type CampaignMetadata = {
  capaId: string;
  documentId: string;
  fromVersionId: string;
  toVersionId: string;
  curriculumId: string;
  assignmentIds: string[];
  membershipIds: string[];
};

const impactEntityId = (capaId: string, documentId: string) => `${capaId}:${documentId}`;

export async function planCapaDocumentImpact(actor: Actor, input: { capaId: string; documentId: string; reason: string; dueDays?: number }) {
  const capa = await db.capa.findFirst({ where: { id: input.capaId, tenantId: actor.tenantId }, include: { deviation: { include: { rootCauseAnalysis: true } } } });
  if (!capa) throw new Error('CAPA_NOT_FOUND');
  if (!['OPEN', 'IN_PROGRESS'].includes(capa.status)) throw new Error('CAPA_NOT_OPEN_FOR_IMPACT');
  const document = await db.document.findFirst({ where: { id: input.documentId, tenantId: actor.tenantId }, include: { currentVersion: true } });
  if (!document?.currentVersion || document.status !== 'EFFECTIVE') throw new Error('EFFECTIVE_DOCUMENT_REQUIRED');
  const entityId = impactEntityId(capa.id, document.id);
  const existing = await db.auditEvent.findFirst({ where: { tenantId: actor.tenantId, action: 'QMS_IMPACT_PLANNED', entityType: 'CapaDocumentImpact', entityId } });
  if (existing) throw new Error('IMPACT_ALREADY_PLANNED');
  const metadata: ImpactMetadata = { capaId: capa.id, documentId: document.id, fromVersionId: document.currentVersion.id, reason: input.reason, dueDays: input.dueDays ?? 14 };
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'QMS_IMPACT_PLANNED', entityType: 'CapaDocumentImpact', entityId, reason: input.reason, after: metadata, metadata });
  await db.capa.update({ where: { id: capa.id }, data: { status: 'IN_PROGRESS' } });
  return { capaId: capa.id, documentId: document.id, documentNumber: document.documentNumber, fromVersionId: document.currentVersion.id, dueDays: metadata.dueDays };
}

async function affectedMembershipIds(tenantId: string, documentId: string, fromVersionId: string) {
  const impactedItems = await db.curriculumItem.findMany({
    where: { documentId, documentVersionId: fromVersionId, curriculum: { tenantId } },
    include: { curriculum: true },
  });
  const curriculumIds = impactedItems.map((i) => i.curriculumId);
  const roleIds = impactedItems.map((i) => i.curriculum.jobRoleId).filter((id): id is string => Boolean(id));
  const [assigned, roleMembers] = await Promise.all([
    curriculumIds.length ? db.trainingAssignment.findMany({ where: { curriculumId: { in: curriculumIds }, membership: { tenantId, status: 'ACTIVE' } }, select: { membershipId: true } }) : [],
    roleIds.length ? db.membership.findMany({ where: { tenantId, status: 'ACTIVE', jobRoleId: { in: roleIds } }, select: { id: true } }) : [],
  ]);
  return [...new Set([...assigned.map((a) => a.membershipId), ...roleMembers.map((m) => m.id)])];
}

export async function launchRetrainingForEffectiveDocument(actor: Actor, documentId: string) {
  const document = await db.document.findFirst({ where: { id: documentId, tenantId: actor.tenantId }, include: { currentVersion: true } });
  if (!document?.currentVersion?.effectiveAt || document.status !== 'EFFECTIVE') return [];
  const plans = await db.auditEvent.findMany({ where: { tenantId: actor.tenantId, action: 'QMS_IMPACT_PLANNED', entityType: 'CapaDocumentImpact' } });
  const relevant = plans.filter((p) => {
    const metadata = p.metadata as ImpactMetadata | null;
    return metadata?.documentId === documentId && metadata.fromVersionId !== document.currentVersion!.id;
  });
  const campaigns: CampaignMetadata[] = [];
  for (const plan of relevant) {
    const meta = plan.metadata as ImpactMetadata;
    const entityId = impactEntityId(meta.capaId, documentId);
    const existing = await db.auditEvent.findFirst({ where: { tenantId: actor.tenantId, action: 'RETRAINING_CAMPAIGN_CREATED', entityType: 'CapaDocumentImpact', entityId } });
    if (existing) continue;
    const capa = await db.capa.findFirst({ where: { id: meta.capaId, tenantId: actor.tenantId } });
    if (!capa || ['CANCELLED', 'CLOSED'].includes(capa.status)) continue;
    const membershipIds = await affectedMembershipIds(actor.tenantId, documentId, meta.fromVersionId);
    const safeCode = `RT-${capa.capaNumber}-${document.documentNumber}-V${document.currentVersion.version}`.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 120);
    const curriculum = await db.curriculum.create({ data: { tenantId: actor.tenantId, code: safeCode, title: `Retraining: ${document.title} v${document.currentVersion.version}`, version: 1, active: true } });
    await db.curriculumItem.create({ data: { curriculumId: curriculum.id, documentId, documentVersionId: document.currentVersion.id, sequence: 1, required: true } });
    const dueAt = new Date(Date.now() + meta.dueDays * 24 * 60 * 60 * 1000);
    const assignmentIds: string[] = [];
    for (const membershipId of membershipIds) {
      const assignment = await db.trainingAssignment.create({ data: { membershipId, curriculumId: curriculum.id, dueAt } });
      assignmentIds.push(assignment.id);
      await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'RETRAINING_ASSIGNED', entityType: 'TrainingAssignment', entityId: assignment.id, after: { capaId: capa.id, documentId, documentVersionId: document.currentVersion.id, membershipId, dueAt: dueAt.toISOString() } });
    }
    const campaign: CampaignMetadata = { capaId: capa.id, documentId, fromVersionId: meta.fromVersionId, toVersionId: document.currentVersion.id, curriculumId: curriculum.id, assignmentIds, membershipIds };
    await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'RETRAINING_CAMPAIGN_CREATED', entityType: 'CapaDocumentImpact', entityId, after: campaign, metadata: campaign });
    campaigns.push(campaign);
  }
  return campaigns;
}

export async function getCapaIntegrationStatus(tenantId: string, capaId: string) {
  const [plans, campaigns] = await Promise.all([
    db.auditEvent.findMany({ where: { tenantId, action: 'QMS_IMPACT_PLANNED', entityType: 'CapaDocumentImpact' }, orderBy: { occurredAt: 'asc' } }),
    db.auditEvent.findMany({ where: { tenantId, action: 'RETRAINING_CAMPAIGN_CREATED', entityType: 'CapaDocumentImpact' }, orderBy: { occurredAt: 'desc' } }),
  ]);
  const relevantPlans = plans.filter((p) => (p.metadata as ImpactMetadata | null)?.capaId === capaId);
  const relevantCampaigns = campaigns.filter((c) => (c.metadata as CampaignMetadata | null)?.capaId === capaId);
  const details = [];
  for (const plan of relevantPlans) {
    const planned = plan.metadata as ImpactMetadata;
    const campaignEvent = relevantCampaigns.find((c) => (c.metadata as CampaignMetadata).documentId === planned.documentId);
    if (!campaignEvent) {
      details.push({ ...planned, state: 'WAITING_FOR_EFFECTIVE_REVISION' as const, assignments: [], complete: false });
      continue;
    }
    const meta = campaignEvent.metadata as CampaignMetadata;
    const assignments = meta.assignmentIds.length
      ? await db.trainingAssignment.findMany({ where: { id: { in: meta.assignmentIds } }, select: { id: true, membershipId: true, status: true, dueAt: true, completedAt: true } })
      : [];
    const complete = assignments.length === meta.assignmentIds.length && assignments.every((a) => a.status === 'COMPLETED');
    details.push({ ...meta, state: complete ? 'COMPLETE' as const : 'RETRAINING_IN_PROGRESS' as const, assignments, complete });
  }
  return { capaId, impacts: details, complete: relevantPlans.length === 0 ? true : details.every((d) => d.complete) };
}

export async function assertCapaRetrainingComplete(tenantId: string, capaId: string) {
  const status = await getCapaIntegrationStatus(tenantId, capaId);
  if (!status.complete) throw new Error('RETRAINING_INCOMPLETE');
  return status;
}

export async function assertDeviationRetrainingComplete(tenantId: string, deviationId: string) {
  const capas = await db.capa.findMany({ where: { tenantId, deviationId }, select: { id: true } });
  for (const capa of capas) await assertCapaRetrainingComplete(tenantId, capa.id);
}
