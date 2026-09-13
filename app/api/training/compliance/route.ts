import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { getComplianceDashboard } from '@/lib/training';

export const runtime = 'nodejs';
export async function GET() {
  try {
    const session = await requirePermission('training.compliance.read');
    return NextResponse.json(await getComplianceDashboard(session.tenantId));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : 403 });
  }
}
