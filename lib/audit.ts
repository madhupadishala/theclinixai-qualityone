import { createHash } from 'node:crypto';
import { db } from './db';

type AuditInput = {
  tenantId: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
};

export async function appendAuditEvent(input: AuditInput) {
  const previous = await db.auditEvent.findFirst({ where: { tenantId: input.tenantId }, orderBy: { occurredAt: 'desc' } });
  const occurredAt = new Date();
  const canonical = JSON.stringify({ ...input, occurredAt: occurredAt.toISOString(), prevHash: previous?.eventHash ?? null });
  const eventHash = createHash('sha256').update(canonical).digest('hex');
  return db.auditEvent.create({ data: { ...input, before: input.before as never, after: input.after as never, metadata: input.metadata as never, occurredAt, prevHash: previous?.eventHash, eventHash } });
}
