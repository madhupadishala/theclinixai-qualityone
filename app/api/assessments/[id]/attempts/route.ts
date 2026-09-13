import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { startAssessment } from '@/lib/qualification';

export const runtime = 'nodejs';

const Body = z.object({ assignmentId: z.string().min(1) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('assessments.attempt');
    const { id } = await context.params;
    const { assignmentId } = Body.parse(await request.json());
    const result = await startAssessment({ tenantId: session.tenantId, userId: session.userId, membershipId: session.membershipId }, id, assignmentId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 400 });
  }
}
