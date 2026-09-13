import { createHash } from 'node:crypto';
import { db } from './db';
import { appendAuditEvent, appendAuditEventTx } from './audit';
import { launchRetrainingForEffectiveDocument } from './integration';

type Actor = { tenantId: string; userId: string; membershipId: string };

export const DOC_PERMISSIONS = {
  create: 'documents.create',
  submitReview: 'documents.submit_review',
  review: 'documents.review',
  approve: 'documents.approve',
  makeEffective: 'documents.make_effective',
  revise: 'documents.revise',
  retire: 'documents.retire',
} as const;

export function hashContent(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

export async function listDocuments(tenantId: string) {
  return db.document.findMany({
    where: { tenantId },
    orderBy: { updatedAt: 'desc' },
    include: { currentVersion: true },
  });
}

export async function getDocument(tenantId: string, id: string) {
  return db.document.findFirst({
    where: { tenantId, id },
    include: { versions: { orderBy: { version: 'desc' } }, currentVersion: true },
  });
}

export async function createDocument(actor: Actor, input: { documentNumber: string; title: string; type: string; storageKey: string; content: string; changeSummary?: string }) {
  const contentHash = hashContent(input.content);
  return db.$transaction(async (tx) => {
    const document = await tx.document.create({
      data: { tenantId: actor.tenantId, documentNumber: input.documentNumber.trim(), title: input.title.trim(), type: input.type.trim() },
    });
    const version = await tx.documentVersion.create({
      data: { documentId: document.id, version: 1, contentHash, storageKey: input.storageKey, changeSummary: input.changeSummary ?? 'Initial version' },
    });
    const updated = await tx.document.update({ where: { id: document.id }, data: { currentVersionId: version.id } });
    await appendAuditEventTx(tx, {
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: 'DOCUMENT_CREATED',
      entityType: 'Document',
      entityId: document.id,
      after: { documentNumber: document.documentNumber, title: document.title, type: document.type, version: 1, contentHash },
    });
    return { ...updated, currentVersion: version };
  });
}

export async function submitForReview(actor: Actor, documentId: string, reason?: string) {
  const document = await getDocument(actor.tenantId, documentId);
  if (!document || document.status !== 'DRAFT' || !document.currentVersion) throw new Error('INVALID_DOCUMENT_STATE');
  const updated = await db.document.update({ where: { id: document.id }, data: { status: 'IN_REVIEW' } });
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'SUBMIT_FOR_REVIEW', entityType: 'Document', entityId: document.id, reason, before: { status: 'DRAFT' }, after: { status: 'IN_REVIEW', version: document.currentVersion.version } });
  return updated;
}

export async function recordReview(actor: Actor, documentId: string, statement: string) {
  const document = await getDocument(actor.tenantId, documentId);
  if (!document || document.status !== 'IN_REVIEW' || !document.currentVersion) throw new Error('INVALID_DOCUMENT_STATE');
  const existing = await db.electronicSignature.findFirst({ where: { userId: actor.userId, entityType: 'DocumentVersion', entityId: document.currentVersion.id, meaning: 'REVIEW' } });
  if (existing) throw new Error('ALREADY_REVIEWED');
  const signature = await db.electronicSignature.create({ data: { userId: actor.userId, meaning: 'REVIEW', entityType: 'DocumentVersion', entityId: document.currentVersion.id, statement, contentHash: document.currentVersion.contentHash } });
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'DOCUMENT_REVIEWED', entityType: 'DocumentVersion', entityId: document.currentVersion.id, after: { signatureId: signature.id, version: document.currentVersion.version } });
  return signature;
}

export async function approveDocument(actor: Actor, documentId: string, statement: string) {
  const document = await getDocument(actor.tenantId, documentId);
  if (!document || document.status !== 'IN_REVIEW' || !document.currentVersion) throw new Error('INVALID_DOCUMENT_STATE');
  const review = await db.electronicSignature.findFirst({ where: { entityType: 'DocumentVersion', entityId: document.currentVersion.id, meaning: 'REVIEW' } });
  if (!review) throw new Error('REVIEW_REQUIRED');
  if (review.userId === actor.userId) throw new Error('SEGREGATION_OF_DUTIES_REQUIRED');
  const existingApproval = await db.electronicSignature.findFirst({ where: { entityType: 'DocumentVersion', entityId: document.currentVersion.id, meaning: 'APPROVAL' } });
  if (existingApproval) throw new Error('ALREADY_APPROVED');
  const signature = await db.electronicSignature.create({ data: { userId: actor.userId, meaning: 'APPROVAL', entityType: 'DocumentVersion', entityId: document.currentVersion.id, statement, contentHash: document.currentVersion.contentHash } });
  const updated = await db.document.update({ where: { id: document.id }, data: { status: 'APPROVED' } });
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'DOCUMENT_APPROVED', entityType: 'Document', entityId: document.id, before: { status: 'IN_REVIEW' }, after: { status: 'APPROVED', version: document.currentVersion.version, signatureId: signature.id, reviewerUserId: review.userId, approverUserId: actor.userId } });
  return updated;
}

export async function makeEffective(actor: Actor, documentId: string, effectiveAt = new Date()) {
  const document = await getDocument(actor.tenantId, documentId);
  if (!document || document.status !== 'APPROVED' || !document.currentVersion) throw new Error('INVALID_DOCUMENT_STATE');
  const approved = await db.electronicSignature.findFirst({ where: { entityType: 'DocumentVersion', entityId: document.currentVersion.id, meaning: 'APPROVAL' } });
  if (!approved) throw new Error('APPROVAL_REQUIRED');
  await db.documentVersion.update({ where: { id: document.currentVersion.id }, data: { effectiveAt } });
  const updated = await db.document.update({ where: { id: document.id }, data: { status: 'EFFECTIVE' } });
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'DOCUMENT_EFFECTIVE', entityType: 'Document', entityId: document.id, before: { status: 'APPROVED' }, after: { status: 'EFFECTIVE', effectiveAt: effectiveAt.toISOString(), version: document.currentVersion.version } });
  const retrainingCampaigns = await launchRetrainingForEffectiveDocument(actor, document.id);
  return { ...updated, retrainingCampaigns };
}

export async function createRevision(actor: Actor, documentId: string, input: { storageKey: string; content: string; changeSummary: string }) {
  const document = await getDocument(actor.tenantId, documentId);
  if (!document || document.status !== 'EFFECTIVE' || !document.currentVersion) throw new Error('INVALID_DOCUMENT_STATE');
  const nextVersion = document.currentVersion.version + 1;
  const contentHash = hashContent(input.content);
  return db.$transaction(async (tx) => {
    await tx.documentVersion.update({ where: { id: document.currentVersion!.id }, data: { supersededAt: new Date() } });
    const version = await tx.documentVersion.create({ data: { documentId: document.id, version: nextVersion, contentHash, storageKey: input.storageKey, changeSummary: input.changeSummary } });
    const updated = await tx.document.update({ where: { id: document.id }, data: { currentVersionId: version.id, status: 'DRAFT' } });
    await appendAuditEventTx(tx, {
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: 'DOCUMENT_REVISION_CREATED',
      entityType: 'Document',
      entityId: document.id,
      before: { version: document.currentVersion!.version, status: 'EFFECTIVE' },
      after: { version: nextVersion, status: 'DRAFT', contentHash },
    });
    return { ...updated, currentVersion: version };
  });
}

export async function retireDocument(actor: Actor, documentId: string, reason: string) {
  const document = await getDocument(actor.tenantId, documentId);
  if (!document || !['EFFECTIVE', 'APPROVED'].includes(document.status)) throw new Error('INVALID_DOCUMENT_STATE');
  const updated = await db.document.update({ where: { id: document.id }, data: { status: 'RETIRED' } });
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'DOCUMENT_RETIRED', entityType: 'Document', entityId: document.id, reason, before: { status: document.status }, after: { status: 'RETIRED' } });
  return updated;
}
