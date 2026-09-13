import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { assertDeviationRetrainingComplete } from '@/lib/integration';
import { closeDeviation, createCapa, recordInvestigation, recordRca } from '@/lib/qms';

export const runtime = 'nodejs';

const Action = z.discriminatedUnion('action', [
  z.object({ action: z.literal('investigate'), scope: z.string().min(3), facts: z.string().min(3), impactAssessment: z.string().optional(), evidence: z.unknown().optional(), complete: z.boolean().optional() }),
  z.object({ action: z.literal('rca'), category: z.enum(['PEOPLE','PROCESS','PROCEDURE','TECHNOLOGY','TRAINING','MATERIAL','ENVIRONMENT','DATA','OTHER']), rootCause: z.string().min(3), contributing: z.string().optional(), method: z.string().optional(), evidence: z.unknown().optional() }),
  z.object({ action: z.literal('create_capa'), capaNumber: z.string().min(3), type: z.enum(['CORRECTIVE','PREVENTIVE']), title: z.string().min(3), capaAction: z.string().min(3), rationale: z.string().optional(), ownerUserId: z.string().min(1), dueAt: z.string().datetime().optional() }),
  z.object({ action: z.literal('close'), closureSummary: z.string().min(3), statement: z.string().min(3) }),
]);

const permissions = { investigate: 'qms.investigate', rca: 'qms.rca', create_capa: 'qms.capa.create', close: 'qms.close' } as const;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const input = Action.parse(await request.json());
    const session = await requirePermission(permissions[input.action]);
    const actor = { tenantId: session.tenantId, userId: session.userId, membershipId: session.membershipId };
    const { id } = await context.params;
    let result;
    if (input.action === 'investigate') result = await recordInvestigation(actor, id, input);
    else if (input.action === 'rca') result = await recordRca(actor, id, input);
    else if (input.action === 'create_capa') result = await createCapa(actor, id, { capaNumber: input.capaNumber, type: input.type, title: input.title, action: input.capaAction, rationale: input.rationale, ownerUserId: input.ownerUserId, dueAt: input.dueAt ? new Date(input.dueAt) : undefined });
    else {
      await assertDeviationRetrainingComplete(session.tenantId, id);
      result = await closeDeviation(actor, id, input);
    }
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' || message === 'UNAUTHORIZED' ? 403 : 400 });
  }
}
