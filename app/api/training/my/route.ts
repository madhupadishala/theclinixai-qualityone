import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { getMyTraining } from '@/lib/training';

export const runtime = 'nodejs';
export async function GET() {
  try {
    const session = await requirePermission('training.my.read');
    return NextResponse.json({ assignments: await getMyTraining({ tenantId: session.tenantId, userId: session.userId, membershipId: session.membershipId }) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : 403 });
  }
}
