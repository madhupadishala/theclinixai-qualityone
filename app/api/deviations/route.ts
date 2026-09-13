import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { createDeviation, listDeviations } from '@/lib/qms';
export const runtime = 'nodejs';
const Body = z.object({ deviationNumber: z.string().min(3).max(64), title: z.string().min(3).max(240), description: z.string().min(3), severity: z.enum(['MINOR','MAJOR','CRITICAL']), departmentId: z.string().optional(), ownerUserId: z.string().min(1), discoveredAt: z.string().datetime(), dueAt: z.string().datetime().optional(), immediateAction: z.string().max(2000).optional() });
export async function GET(){ try { const s=await requirePermission('qms.deviations.read'); return NextResponse.json({deviations:await listDeviations(s.tenantId)}); } catch(e){return err(e);} }
export async function POST(r:Request){ try { const s=await requirePermission('qms.deviations.create'); const x=Body.parse(await r.json()); const deviation=await createDeviation({tenantId:s.tenantId,userId:s.userId,membershipId:s.membershipId},{...x,discoveredAt:new Date(x.discoveredAt),dueAt:x.dueAt?new Date(x.dueAt):undefined}); return NextResponse.json({deviation},{status:201}); } catch(e){return err(e);} }
function err(e:unknown){const m=e instanceof Error?e.message:'UNKNOWN_ERROR';return NextResponse.json({error:m},{status:m==='UNAUTHENTICATED'?401:m==='FORBIDDEN'||m==='UNAUTHORIZED'?403:400});}
