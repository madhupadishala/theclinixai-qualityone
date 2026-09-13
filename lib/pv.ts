import { createHash } from 'node:crypto';
import { db } from './db';
import { appendAuditEvent } from './audit';
import { evaluateQualification, recordPracticalObservation, signoffQualification } from './qualification';

type Actor = { tenantId: string; userId: string; membershipId: string };

type PvCompetency = {
  code: string;
  title: string;
  minimumCases: number;
  minimumQcScore: number;
  critical?: boolean;
};

type PvProfile = {
  profileCode: string;
  title: string;
  curriculumId: string;
  clientCode?: string;
  safetyDatabase?: string;
  version: number;
  competencies: PvCompetency[];
};

const profileEntityId = (curriculumId: string, profileCode: string) => `${curriculumId}:${profileCode}`;

export const PV_COMPETENCY_LIBRARY = [
  { code: 'PV_INTAKE', title: 'Safety Intake' },
  { code: 'PV_TRIAGE', title: 'Case Triage' },
  { code: 'PV_ICSR', title: 'ICSR Case Processing' },
  { code: 'PV_MEDDRA', title: 'MedDRA Coding' },
  { code: 'PV_LITERATURE', title: 'Literature Screening' },
  { code: 'PV_NARRATIVE', title: 'Narrative Writing' },
  { code: 'PV_FOLLOWUP', title: 'Case Follow-up' },
  { code: 'PV_SUBMISSION', title: 'Safety Submission' },
  { code: 'PV_QC', title: 'Case Quality Control' },
  { code: 'PV_MEDICAL_REVIEW', title: 'Medical Review' },
  { code: 'PV_AGGREGATE', title: 'Aggregate Reporting' },
  { code: 'PV_SIGNAL', title: 'Signal Management' },
] as const;

function normalizeProfile(value: unknown): PvProfile | null {
  if (!value || typeof value !== 'object') return null;
  const p = value as Partial<PvProfile>;
  if (!p.profileCode || !p.title || !p.curriculumId || !Array.isArray(p.competencies) || !p.version) return null;
  return p as PvProfile;
}

export async function configurePvProfile(actor: Actor, input: {
  profileCode: string;
  title: string;
  curriculumId: string;
  clientCode?: string;
  safetyDatabase?: string;
  competencies: PvCompetency[];
}) {
  const curriculum = await db.curriculum.findFirst({ where: { id: input.curriculumId, tenantId: actor.tenantId, active: true } });
  if (!curriculum) throw new Error('CURRICULUM_NOT_FOUND');
  if (!input.competencies.length) throw new Error('PV_COMPETENCIES_REQUIRED');
  const codes = new Set<string>();
  for (const c of input.competencies) {
    if (!c.code.trim() || !c.title.trim()) throw new Error('INVALID_COMPETENCY');
    if (codes.has(c.code)) throw new Error('DUPLICATE_COMPETENCY');
    if (c.minimumCases < 0 || c.minimumQcScore < 0 || c.minimumQcScore > 100) throw new Error('INVALID_COMPETENCY_THRESHOLD');
    codes.add(c.code);
  }
  const entityId = profileEntityId(input.curriculumId, input.profileCode.trim());
  const previous = await db.auditEvent.findFirst({
    where: { tenantId: actor.tenantId, entityType: 'PvQualificationProfile', entityId, action: 'PV_PROFILE_CONFIGURED' },
    orderBy: { occurredAt: 'desc' },
  });
  const priorProfile = normalizeProfile(previous?.after);
  const profile: PvProfile = {
    profileCode: input.profileCode.trim(),
    title: input.title.trim(),
    curriculumId: input.curriculumId,
    clientCode: input.clientCode?.trim() || undefined,
    safetyDatabase: input.safetyDatabase?.trim() || undefined,
    version: (priorProfile?.version ?? 0) + 1,
    competencies: input.competencies.map((c) => ({ ...c, code: c.code.trim(), title: c.title.trim() })),
  };
  await appendAuditEvent({
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    action: 'PV_PROFILE_CONFIGURED',
    entityType: 'PvQualificationProfile',
    entityId,
    before: priorProfile ?? undefined,
    after: profile,
    metadata: { profileCode: profile.profileCode, curriculumId: profile.curriculumId, version: profile.version },
  });
  return profile;
}

export async function getPvProfile(tenantId: string, curriculumId: string, profileCode?: string) {
  const events = await db.auditEvent.findMany({
    where: { tenantId, entityType: 'PvQualificationProfile', action: 'PV_PROFILE_CONFIGURED' },
    orderBy: { occurredAt: 'desc' },
  });
  const seen = new Set<string>();
  const profiles: PvProfile[] = [];
  for (const event of events) {
    if (seen.has(event.entityId)) continue;
    seen.add(event.entityId);
    const profile = normalizeProfile(event.after);
    if (!profile || profile.curriculumId !== curriculumId) continue;
    if (profileCode && profile.profileCode !== profileCode) continue;
    profiles.push(profile);
  }
  return profileCode ? profiles[0] ?? null : profiles;
}

export async function recordPvCaseEvidence(actor: Actor, input: {
  profileCode: string;
  assignmentId: string;
  membershipId: string;
  competencyCode: string;
  caseCount: number;
  qcScore: number;
  clientCode?: string;
  safetyDatabase?: string;
  evidenceRef?: string;
  notes?: string;
}) {
  const assignment = await db.trainingAssignment.findFirst({
    where: { id: input.assignmentId, membershipId: input.membershipId },
    include: { membership: true, curriculum: true },
  });
  if (!assignment || assignment.membership.tenantId !== actor.tenantId) throw new Error('ASSIGNMENT_NOT_FOUND');
  const profile = await getPvProfile(actor.tenantId, assignment.curriculumId, input.profileCode);
  if (!profile || Array.isArray(profile)) throw new Error('PV_PROFILE_NOT_FOUND');
  const competency = profile.competencies.find((c) => c.code === input.competencyCode);
  if (!competency) throw new Error('COMPETENCY_NOT_IN_PROFILE');
  if (profile.clientCode && profile.clientCode !== input.clientCode) throw new Error('CLIENT_CONTEXT_MISMATCH');
  if (profile.safetyDatabase && profile.safetyDatabase !== input.safetyDatabase) throw new Error('DATABASE_CONTEXT_MISMATCH');
  if (input.caseCount <= 0 || input.qcScore < 0 || input.qcScore > 100) throw new Error('INVALID_PV_EVIDENCE');

  const context = [profile.profileCode, profile.clientCode ?? 'ANY_CLIENT', profile.safetyDatabase ?? 'ANY_DB'].join('|');
  const observation = await recordPracticalObservation(actor, {
    assignmentId: input.assignmentId,
    membershipId: input.membershipId,
    competencyCode: `${input.competencyCode}|${context}`,
    sampleCount: input.caseCount,
    qualityScore: input.qcScore,
    notes: input.notes,
    evidenceRef: input.evidenceRef,
  });
  await appendAuditEvent({
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    action: 'PV_CASE_EVIDENCE_RECORDED',
    entityType: 'PracticalObservation',
    entityId: observation.id,
    after: {
      profileCode: profile.profileCode,
      profileVersion: profile.version,
      competencyCode: input.competencyCode,
      caseCount: input.caseCount,
      qcScore: input.qcScore,
      clientCode: input.clientCode ?? null,
      safetyDatabase: input.safetyDatabase ?? null,
      evidenceRef: input.evidenceRef ?? null,
    },
  });
  return observation;
}

export async function evaluatePvQualification(actor: Actor, input: { membershipId: string; curriculumId: string; profileCode: string }) {
  const profile = await getPvProfile(actor.tenantId, input.curriculumId, input.profileCode);
  if (!profile || Array.isArray(profile)) throw new Error('PV_PROFILE_NOT_FOUND');
  const base = await evaluateQualification(actor, input.membershipId, input.curriculumId);
  const assignments = await db.trainingAssignment.findMany({ where: { membershipId: input.membershipId, curriculumId: input.curriculumId }, select: { id: true } });
  const assignmentIds = assignments.map((a) => a.id);
  const observations = assignmentIds.length ? await db.practicalObservation.findMany({ where: { membershipId: input.membershipId, assignmentId: { in: assignmentIds } }, orderBy: { observedAt: 'asc' } }) : [];

  const competencyResults = profile.competencies.map((competency) => {
    const prefix = `${competency.code}|${profile.profileCode}|`;
    const matches = observations.filter((o) => o.competencyCode.startsWith(prefix));
    const cases = matches.reduce((sum, o) => sum + o.sampleCount, 0);
    const weighted = matches.reduce((sum, o) => sum + Number(o.qualityScore) * o.sampleCount, 0);
    const qcScore = cases ? Number((weighted / cases).toFixed(2)) : null;
    const passed = cases >= competency.minimumCases && qcScore != null && qcScore >= competency.minimumQcScore;
    const latest = matches[matches.length - 1];
    const criticalFailure = Boolean(competency.critical && latest && Number(latest.qualityScore) < competency.minimumQcScore);
    return { code: competency.code, title: competency.title, requiredCases: competency.minimumCases, observedCases: cases, requiredQcScore: competency.minimumQcScore, qcScore, passed, critical: Boolean(competency.critical), criticalFailure };
  });

  const allPvPassed = competencyResults.every((c) => c.passed);
  const criticalFailure = competencyResults.some((c) => c.criticalFailure);
  const wasQualified = base.status === 'QUALIFIED' || base.status === 'AT_RISK' || base.status === 'SUSPENDED';
  let status = base.status;
  if (criticalFailure && wasQualified) status = 'SUSPENDED';
  else if (!allPvPassed && wasQualified) status = 'AT_RISK';
  else if (!allPvPassed) status = 'IN_PROGRESS';
  else if (base.status !== 'QUALIFIED') status = 'IN_PROGRESS';
  else status = 'QUALIFIED';

  const evidence = {
    ...(base.evidenceSnapshot && typeof base.evidenceSnapshot === 'object' ? base.evidenceSnapshot as Record<string, unknown> : {}),
    pvProfile: { profileCode: profile.profileCode, profileVersion: profile.version, clientCode: profile.clientCode ?? null, safetyDatabase: profile.safetyDatabase ?? null },
    pvCompetencies: competencyResults,
    allPvPassed,
    criticalFailure,
  };
  const updated = await db.qualification.update({ where: { id: base.id }, data: { status, evidenceSnapshot: evidence, lastEvaluatedAt: new Date() } });
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'PV_QUALIFICATION_EVALUATED', entityType: 'Qualification', entityId: updated.id, before: { status: base.status }, after: { status, profileCode: profile.profileCode, profileVersion: profile.version, allPvPassed, criticalFailure, competencies: competencyResults } });
  return { qualification: updated, profile, competencies: competencyResults };
}

export async function signoffPvQualification(actor: Actor, input: { membershipId: string; curriculumId: string; profileCode: string; statement: string }) {
  const evaluation = await evaluatePvQualification(actor, input);
  if (!evaluation.competencies.every((c) => c.passed)) throw new Error('PV_COMPETENCY_REQUIREMENTS_NOT_MET');
  const signed = await signoffQualification(actor, input.membershipId, input.curriculumId, input.statement);
  const finalEvaluation = await evaluatePvQualification(actor, input);
  if (finalEvaluation.qualification.status !== 'QUALIFIED') throw new Error('PV_QUALIFICATION_NOT_READY');
  const evidenceHash = createHash('sha256').update(JSON.stringify(finalEvaluation.qualification.evidenceSnapshot)).digest('hex');
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'PV_QUALIFICATION_SIGNED_OFF', entityType: 'Qualification', entityId: signed.id, after: { profileCode: input.profileCode, signatureId: signed.signoffSignatureId, evidenceHash } });
  return finalEvaluation;
}
