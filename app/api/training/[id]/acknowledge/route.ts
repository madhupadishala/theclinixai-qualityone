import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { acknowledgeTraining } from '@/lib/training';

export const runtime = 'nodejs';
const Input = z.object({ curriculumItemId: z.string(), statement: z.string().min(3).max(500) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('training.complete');
    const { id } = await context.params;
    const input = Input.parse(await request.json());
    const result = await acknowledgeTraining({ tenantId: session.tenantId, userId: session.userId, membershipId: session.membershipId }, { assignmentId: id, ...input });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 400 });
  }
}
