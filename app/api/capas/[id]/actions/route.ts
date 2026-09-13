import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { recordEffectiveness, updateCapa } from '@/lib/qms';
export const runtime='nodejs';
const Body=z.discriminatedUnion('action',[
 z.object({action:z.literal('status'),status:z.enum(['OPEN','IN_PROGRESS','PENDING_VERIFICATION','EFFECTIVE','INEFFECTIVE','CLOSED','CANCELLED']),verificationSummary:z.string().optional()}),
 z.object({action:z.literal('effectiveness'),outcome:z.enum(['EFFECTIVE','PARTIALLY_EFFECTIVE','INEFFECTIVE']),evidence:z.string().min(3),notes:z.string().optional(),plannedAt:z.string().datetime().optional()})
]);
export async function POST(r:Request,c:{params:Promise<{id:string}>}){try{const x=Body.parse(await r.json());const s=await requirePermission(x.action==='status'?'qms.capa.manage':'qms.effectiveness');const {id}=await c.params;const actor={tenantId:s.tenantId,userId:s.userId,membershipId:s.membershipId};const result=x.action==='status'?await updateCapa(actor,id,x):await recordEffectiveness(actor,id,{...x,plannedAt:x.plannedAt?new Date(x.plannedAt):undefined});return NextResponse.json({result});}catch(e){const m=e instanceof Error?e.message:'UNKNOWN_ERROR';return NextResponse.json({error:m},{status:m==='UNAUTHENTICATED'?401:m==='FORBIDDEN'||m==='UNAUTHORIZED'?403:400});}}
