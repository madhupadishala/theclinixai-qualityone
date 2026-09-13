import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/authorization';
import { closeDeviation, createCapa, recordInvestigation, recordRca } from '@/lib/qms';
export const runtime='nodejs';
const Action=z.discriminatedUnion('action',[
 z.object({action:z.literal('investigate'),scope:z.string().min(3),facts:z.string().min(3),impactAssessment:z.string().optional(),evidence:z.unknown().optional(),complete:z.boolean().optional()}),
 z.object({action:z.literal('rca'),category:z.enum(['PEOPLE','PROCESS','PROCEDURE','TECHNOLOGY','TRAINING','MATERIAL','ENVIRONMENT','DATA','OTHER']),rootCause:z.string().min(3),contributing:z.string().optional(),method:z.string().optional(),evidence:z.unknown().optional()}),
 z.object({action:z.literal('create_capa'),capaNumber:z.string().min(3),type:z.enum(['CORRECTIVE','PREVENTIVE']),title:z.string().min(3),capaAction:z.string().min(3),rationale:z.string().optional(),ownerUserId:z.string().min(1),dueAt:z.string().datetime().optional()}),
 z.object({action:z.literal('close'),closureSummary:z.string().min(3),statement:z.string().min(3)})
]);
const perms={investigate:'qms.investigate',rca:'qms.rca',create_capa:'qms.capa.create',close:'qms.close'} as const;
export async function POST(r:Request,c:{params:Promise<{id:string}>}){try{const x=Action.parse(await r.json());const s=await requirePermission(perms[x.action]);const actor={tenantId:s.tenantId,userId:s.userId,membershipId:s.membershipId};const {id}=await c.params;let result;if(x.action==='investigate')result=await recordInvestigation(actor,id,x);else if(x.action==='rca')result=await recordRca(actor,id,x);else if(x.action==='create_capa')result=await createCapa(actor,id,{capaNumber:x.capaNumber,type:x.type,title:x.title,action:x.capaAction,rationale:x.rationale,ownerUserId:x.ownerUserId,dueAt:x.dueAt?new Date(x.dueAt):undefined});else result=await closeDeviation(actor,id,x);return NextResponse.json({result});}catch(e){const m=e instanceof Error?e.message:'UNKNOWN_ERROR';return NextResponse.json({error:m},{status:m==='UNAUTHENTICATED'?401:m==='FORBIDDEN'||m==='UNAUTHORIZED'?403:400});}}
