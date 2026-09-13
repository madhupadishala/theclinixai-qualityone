import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { evaluateQualification, getQualification, signoffQualification } from '@/lib/qualification';

export const runtime = 'nodejs';

const Action = z.discriminatedUnion('action', [
  z.object({ action: z.literal('evaluate') }),
  z.object({ action: z.literal('signoff'), statement: z.string().min(3).max(500) }),
]);

export async function GET(_: Request, context: { params: Promise<{ membershipId: string; curriculumId: string }> }) {
  try {
    const session = await requirePermission('qualification.read');
    const { membershipId, curriculumId } = await context.params;
    const qualification = await getQualification(session.tenantId, membershipId, curriculumId);
    return NextResponse.json({ qualification });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : 403 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ membershipId: string; curriculumId: string }> }) {
  try {
    const input = Action.parse(await request.json());
    const permission = input.action === 'signoff' ? 'qualification.signoff' : 'qualification.evaluate';
    const session = await requirePermission(permission);
    const { membershipId, curriculumId } = await context.params;
    const actor = { tenantId: session.tenantId, userId: session.userId, membershipId: session.membershipId };
    const qualification = input.action === 'signoff'
      ? await signoffQualification(actor, membershipId, curriculumId, input.statement)
      : await evaluateQualification(actor, membershipId, curriculumId);
    return NextResponse.json({ qualification });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 400 });
  }
}
