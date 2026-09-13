import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { db } from './db';

export type AuditInput = {
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

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

export function computeAuditHash(input: AuditInput, occurredAt: Date, prevHash: string | null) {
  const canonical = JSON.stringify(canonicalize({ ...input, occurredAt: occurredAt.toISOString(), prevHash }));
  return createHash('sha256').update(canonical).digest('hex');
}

export async function appendAuditEventTx(tx: Prisma.TransactionClient, input: AuditInput) {
  // Serialize audit writes per tenant. This prevents two concurrent regulated
  // actions from selecting the same predecessor and forking the hash chain.
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${input.tenantId}))`);
  const previous = await tx.auditEvent.findFirst({
    where: { tenantId: input.tenantId },
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
  });
  const occurredAt = new Date();
  const prevHash = previous?.eventHash ?? null;
  const eventHash = computeAuditHash(input, occurredAt, prevHash);
  return tx.auditEvent.create({
    data: {
      ...input,
      before: input.before as Prisma.InputJsonValue | undefined,
      after: input.after as Prisma.InputJsonValue | undefined,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      occurredAt,
      prevHash,
      eventHash,
    },
  });
}

export async function appendAuditEvent(input: AuditInput) {
  return db.$transaction((tx) => appendAuditEventTx(tx, input));
}
