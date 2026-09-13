import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { evaluatePvQualification, signoffPvQualification } from '@/lib/pv';

export const runtime = 'nodejs';

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('evaluate'), profileCode: z.string().min(2).max(80) }),
  z.object({ action: z.literal('signoff'), profileCode: z.string().min(2).max(80), statement: z.string().min(3).max(1000) }),
]);

export async function POST(request: Request, context: { params: Promise<{ membershipId: string; curriculumId: string }> }) {
  try {
    const input = Body.parse(await request.json());
    const permission = input.action === 'signoff' ? 'pv.qualifications.signoff' : 'pv.qualifications.evaluate';
    const session = await requirePermission(permission);
    const { membershipId, curriculumId } = await context.params;
    const actor = { tenantId: session.tenantId, userId: session.userId, membershipId: session.membershipId };
    const result = input.action === 'signoff'
      ? await signoffPvQualification(actor, { membershipId, curriculumId, profileCode: input.profileCode, statement: input.statement })
      : await evaluatePvQualification(actor, { membershipId, curriculumId, profileCode: input.profileCode });
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 400 });
  }
}
