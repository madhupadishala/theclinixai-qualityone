import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { getCapaAging, getExecutiveDashboard, getInspectionEvidenceSnapshot, getQualificationHeatmap, getTrainingMatrix } from '@/lib/reporting';

export const runtime = 'nodejs';

const handlers = {
  dashboard: getExecutiveDashboard,
  training: getTrainingMatrix,
  capas: getCapaAging,
  qualifications: getQualificationHeatmap,
  inspection: getInspectionEvidenceSnapshot,
} as const;

export async function GET(_request: Request, context: { params: Promise<{ view: string }> }) {
  try {
    const session = await requirePermission('reporting.read');
    const { view } = await context.params;
    const handler = handlers[view as keyof typeof handlers];
    if (!handler) return NextResponse.json({ error: 'REPORT_NOT_FOUND' }, { status: 404 });
    const data = await handler(session.tenantId);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' || message === 'UNAUTHORIZED' ? 403 : 400 });
  }
}
