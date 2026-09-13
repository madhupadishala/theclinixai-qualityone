import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { assignCurriculum } from '@/lib/training';

export const runtime = 'nodejs';
const Input = z.object({ curriculumId: z.string(), membershipIds: z.array(z.string()).optional(), dueAt: z.string().datetime().optional() });

export async function POST(request: Request) {
  try {
    const session = await requirePermission('training.assign');
    const input = Input.parse(await request.json());
    const assignments = await assignCurriculum({ tenantId: session.tenantId, userId: session.userId, membershipId: session.membershipId }, { ...input, dueAt: input.dueAt ? new Date(input.dueAt) : undefined });
    return NextResponse.json({ assignments }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 400 });
  }
}
