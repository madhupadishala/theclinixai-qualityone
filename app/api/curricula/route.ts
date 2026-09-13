import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { createCurriculum } from '@/lib/training';

export const runtime = 'nodejs';

const Create = z.object({
  code: z.string().min(2).max(64),
  title: z.string().min(3).max(200),
  jobRoleId: z.string().optional(),
  items: z.array(z.object({ documentId: z.string(), sequence: z.number().int().positive(), required: z.boolean().optional(), passingScore: z.number().int().min(0).max(100).optional() })).min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requirePermission('training.curricula.manage');
    const input = Create.parse(await request.json());
    const curriculum = await createCurriculum({ tenantId: session.tenantId, userId: session.userId, membershipId: session.membershipId }, input);
    return NextResponse.json({ curriculum }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 400 });
  }
}
