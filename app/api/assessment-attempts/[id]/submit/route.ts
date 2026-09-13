import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { submitAssessment } from '@/lib/qualification';

export const runtime = 'nodejs';

const Body = z.object({ answers: z.array(z.object({ questionId: z.string().min(1), answer: z.unknown() })).min(1) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('assessments.attempt');
    const { id } = await context.params;
    const { answers } = Body.parse(await request.json());
    const result = await submitAssessment({ tenantId: session.tenantId, userId: session.userId, membershipId: session.membershipId }, id, answers);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 400 });
  }
}
