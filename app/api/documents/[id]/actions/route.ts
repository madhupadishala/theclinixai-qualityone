import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { approveDocument, createRevision, makeEffective, recordReview, retireDocument, submitForReview } from '@/lib/qualitydocs';

export const runtime = 'nodejs';

const Action = z.discriminatedUnion('action', [
  z.object({ action: z.literal('submit_review'), reason: z.string().max(500).optional() }),
  z.object({ action: z.literal('review'), statement: z.string().min(3).max(500) }),
  z.object({ action: z.literal('approve'), statement: z.string().min(3).max(500) }),
  z.object({ action: z.literal('make_effective'), effectiveAt: z.string().datetime().optional() }),
  z.object({ action: z.literal('create_revision'), storageKey: z.string().min(3).max(500), content: z.string().min(1), changeSummary: z.string().min(3).max(500) }),
  z.object({ action: z.literal('retire'), reason: z.string().min(3).max(500) }),
]);

const permissions = { submit_review: 'documents.submit_review', review: 'documents.review', approve: 'documents.approve', make_effective: 'documents.make_effective', create_revision: 'documents.revise', retire: 'documents.retire' } as const;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const input = Action.parse(await request.json());
    const session = await requirePermission(permissions[input.action]);
    const actor = { tenantId: session.tenantId, userId: session.userId, membershipId: session.membershipId };
    const { id } = await context.params;
    let result;
    if (input.action === 'submit_review') result = await submitForReview(actor, id, input.reason);
    else if (input.action === 'review') result = await recordReview(actor, id, input.statement);
    else if (input.action === 'approve') result = await approveDocument(actor, id, input.statement);
    else if (input.action === 'make_effective') result = await makeEffective(actor, id, input.effectiveAt ? new Date(input.effectiveAt) : new Date());
    else if (input.action === 'create_revision') result = await createRevision(actor, id, input);
    else result = await retireDocument(actor, id, input.reason);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    const status = message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' || message === 'UNAUTHORIZED' ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
