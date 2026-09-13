import { requirePermission } from '@/lib/authorization';
import { getCapaAging, getQualificationHeatmap, getTrainingMatrix } from '@/lib/reporting';

export const runtime = 'nodejs';

const csv = (rows: Array<Record<string, unknown>>) => {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const raw = value == null ? '' : value instanceof Date ? value.toISOString() : typeof value === 'object' ? JSON.stringify(value) : String(value);
    return `"${raw.replaceAll('"', '""')}"`;
  };
  return [keys.map(escape).join(','), ...rows.map((row) => keys.map((key) => escape(row[key])).join(','))].join('\n');
};

export async function GET(_request: Request, context: { params: Promise<{ view: string }> }) {
  try {
    const session = await requirePermission('reporting.read');
    const { view } = await context.params;
    let rows: Array<Record<string, unknown>>;
    if (view === 'training') rows = (await getTrainingMatrix(session.tenantId)).map(({ assignments: _assignments, ...row }) => row);
    else if (view === 'capas') rows = await getCapaAging(session.tenantId);
    else if (view === 'qualifications') rows = await getQualificationHeatmap(session.tenantId);
    else return new Response('REPORT_NOT_FOUND', { status: 404 });
    return new Response(csv(rows), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="qualityone-${view}.csv"`, 'cache-control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return new Response(message, { status: message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' || message === 'UNAUTHORIZED' ? 403 : 400 });
  }
}
