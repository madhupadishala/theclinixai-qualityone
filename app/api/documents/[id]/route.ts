import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { getDocument } from '@/lib/qualitydocs';

export const runtime = 'nodejs';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission('documents.read');
    const { id } = await context.params;
    const document = await getDocument(session.tenantId, id);
    if (!document) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ document });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : 403 });
  }
}
