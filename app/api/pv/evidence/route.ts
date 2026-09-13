import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { recordPvCaseEvidence } from '@/lib/pv';

export const runtime = 'nodejs';

const Body = z.object({
  profileCode: z.string().min(2).max(80),
  assignmentId: z.string().min(1),
  membershipId: z.string().min(1),
  competencyCode: z.string().min(2).max(80),
  caseCount: z.number().int().positive().max(10000),
  qcScore: z.number().min(0).max(100),
  clientCode: z.string().max(100).optional(),
  safetyDatabase: z.string().max(100).optional(),
  evidenceRef: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requirePermission('pv.evidence.record');
    const input = Body.parse(await request.json());
    const observation = await recordPvCaseEvidence({ tenantId: session.tenantId, userId: session.userId, membershipId: session.membershipId }, input);
    return NextResponse.json({ observation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 400 });
  }
}
