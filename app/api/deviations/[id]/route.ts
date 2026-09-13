import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { getDeviation } from '@/lib/qms';
export const runtime='nodejs';
export async function GET(_:Request,c:{params:Promise<{id:string}>}){try{const s=await requirePermission('qms.deviations.read');const {id}=await c.params;const deviation=await getDeviation(s.tenantId,id);return deviation?NextResponse.json({deviation}):NextResponse.json({error:'NOT_FOUND'},{status:404});}catch(e){const m=e instanceof Error?e.message:'UNKNOWN_ERROR';return NextResponse.json({error:m},{status:m==='UNAUTHENTICATED'?401:403});}}
