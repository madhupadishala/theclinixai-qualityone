import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { assertCapaRetrainingComplete } from '@/lib/integration';
import { recordEffectiveness, updateCapa } from '@/lib/qms';

export const runtime = 'nodejs';

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('status'), status: z.enum(['OPEN','IN_PROGRESS','PENDING_VERIFICATION','EFFECTIVE','INEFFECTIVE','CLOSED','CANCELLED']), verificationSummary: z.string().optional() }),
  z.object({ action: z.literal('effectiveness'), outcome: z.enum(['EFFECTIVE','PARTIALLY_EFFECTIVE','INEFFECTIVE']), evidence: z.string().min(3), notes: z.string().optional(), plannedAt: z.string().datetime().optional() }),
]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const input = Body.parse(await request.json());
    const session = await requirePermission(input.action === 'status' ? 'qms.capa.manage' : 'qms.effectiveness');
    const { id } = await context.params;
    const actor = { tenantId: session.tenantId, userId: session.userId, membershipId: session.membershipId };
    if (input.action === 'effectiveness') await assertCapaRetrainingComplete(session.tenantId, id);
    const result = input.action === 'status'
      ? await updateCapa(actor, id, input)
      : await recordEffectiveness(actor, id, { ...input, plannedAt: input.plannedAt ? new Date(input.plannedAt) : undefined });
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' || message === 'UNAUTHORIZED' ? 403 : 400 });
  }
}
