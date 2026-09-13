import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { configurePvProfile, getPvProfile, PV_COMPETENCY_LIBRARY } from '@/lib/pv';

export const runtime = 'nodejs';

const Competency = z.object({
  code: z.string().min(2).max(80),
  title: z.string().min(2).max(160),
  minimumCases: z.number().int().min(0).max(10000),
  minimumQcScore: z.number().min(0).max(100),
  critical: z.boolean().optional(),
});

const Body = z.object({
  profileCode: z.string().min(2).max(80),
  title: z.string().min(3).max(240),
  curriculumId: z.string().min(1),
  clientCode: z.string().max(100).optional(),
  safetyDatabase: z.string().max(100).optional(),
  competencies: z.array(Competency).min(1),
});

export async function GET(request: Request) {
  try {
    const session = await requirePermission('pv.profiles.read');
    const url = new URL(request.url);
    const curriculumId = url.searchParams.get('curriculumId');
    const profileCode = url.searchParams.get('profileCode') ?? undefined;
    if (!curriculumId) return NextResponse.json({ competencyLibrary: PV_COMPETENCY_LIBRARY });
    const profiles = await getPvProfile(session.tenantId, curriculumId, profileCode);
    return NextResponse.json({ profiles, competencyLibrary: PV_COMPETENCY_LIBRARY });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 400 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission('pv.profiles.manage');
    const input = Body.parse(await request.json());
    const profile = await configurePvProfile({ tenantId: session.tenantId, userId: session.userId, membershipId: session.membershipId }, input);
    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 400 });
  }
}
