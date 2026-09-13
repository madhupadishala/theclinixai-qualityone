import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { createDocument, listDocuments } from '@/lib/qualitydocs';

export const runtime = 'nodejs';

const CreateDocument = z.object({ documentNumber: z.string().min(2).max(64), title: z.string().min(3).max(240), type: z.string().min(2).max(64), storageKey: z.string().min(3).max(500), content: z.string().min(1), changeSummary: z.string().max(500).optional() });

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
  const status = message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' || message === 'UNAUTHORIZED' ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const session = await requirePermission('documents.read');
    return NextResponse.json({ documents: await listDocuments(session.tenantId) });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission('documents.create');
    const input = CreateDocument.parse(await request.json());
    const document = await createDocument({ tenantId: session.tenantId, userId: session.userId, membershipId: session.membershipId }, input);
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
