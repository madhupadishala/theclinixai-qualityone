import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { configureQualificationRule } from '@/lib/qualification';

export const runtime = 'nodejs';

const Body = z.object({
  curriculumId: z.string().min(1),
  knowledgeMinScore: z.number().min(0).max(100).optional(),
  practicalMinScore: z.number().min(0).max(100).optional(),
  minimumSamples: z.number().int().min(0).optional(),
  requireTrainingComplete: z.boolean().optional(),
  requireSmeSignoff: z.boolean().optional(),
  validityDays: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requirePermission('qualification.evaluate');
    const input = Body.parse(await request.json());
    const rule = await configureQualificationRule({ tenantId: session.tenantId, userId: session.userId, membershipId: session.membershipId }, input);
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 400 });
  }
}
