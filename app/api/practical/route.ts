import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { recordPracticalObservation } from '@/lib/qualification';

export const runtime = 'nodejs';

const Body = z.object({
  assignmentId: z.string().min(1),
  membershipId: z.string().min(1),
  competencyCode: z.string().min(2).max(100),
  sampleCount: z.number().int().positive(),
  qualityScore: z.number().min(0).max(100),
  notes: z.string().max(2000).optional(),
  evidenceRef: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requirePermission('practical.record');
    const input = Body.parse(await request.json());
    const observation = await recordPracticalObservation({ tenantId: session.tenantId, userId: session.userId, membershipId: session.membershipId }, input);
    return NextResponse.json({ observation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 400 });
  }
}
