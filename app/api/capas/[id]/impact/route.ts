import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { getCapaIntegrationStatus, launchRetrainingForEffectiveDocument, planCapaDocumentImpact } from '@/lib/integration';

export const runtime = 'nodejs';

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('plan'), documentId: z.string().min(1), reason: z.string().min(3).max(1000), dueDays: z.number().int().min(1).max(365).optional() }),
  z.object({ action: z.literal('launch'), documentId: z.string().min(1) }),
]);

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('qms.deviations.read');
    const { id } = await context.params;
    return NextResponse.json(await getCapaIntegrationStatus(session.tenantId, id));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' || message === 'UNAUTHORIZED' ? 403 : 400 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const input = Body.parse(await request.json());
    const session = await requirePermission('qms.capa.manage');
    const { id } = await context.params;
    const actor = { tenantId: session.tenantId, userId: session.userId, membershipId: session.membershipId };
    const result = input.action === 'plan'
      ? await planCapaDocumentImpact(actor, { capaId: id, documentId: input.documentId, reason: input.reason, dueDays: input.dueDays })
      : await launchRetrainingForEffectiveDocument(actor, input.documentId);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' || message === 'UNAUTHORIZED' ? 403 : 400 });
  }
}
