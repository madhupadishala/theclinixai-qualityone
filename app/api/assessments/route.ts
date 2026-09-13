import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { createAssessment } from '@/lib/qualification';

export const runtime = 'nodejs';

const Question = z.object({
  sequence: z.number().int().positive(),
  type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SCENARIO']),
  prompt: z.string().min(3),
  options: z.unknown().optional(),
  correctAnswer: z.unknown(),
  points: z.number().positive().optional(),
  rationale: z.string().max(1000).optional(),
});

const Body = z.object({
  curriculumId: z.string().min(1),
  code: z.string().min(2).max(64),
  title: z.string().min(3).max(240),
  passingScore: z.number().min(0).max(100).optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
  questions: z.array(Question).min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requirePermission('assessments.manage');
    const input = Body.parse(await request.json());
    const assessment = await createAssessment({ tenantId: session.tenantId, userId: session.userId, membershipId: session.membershipId }, input);
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 400 });
  }
}
