import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { db } from './db';
import { appendAuditEvent } from './audit';

type Actor = { tenantId: string; userId: string; membershipId: string };

type QuestionInput = {
  sequence: number;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SCENARIO';
  prompt: string;
  options?: unknown;
  correctAnswer: unknown;
  points?: number;
  rationale?: string;
};

function stable(value: unknown) {
  if (Array.isArray(value)) return JSON.stringify([...value].sort());
  return JSON.stringify(value);
}

export async function createAssessment(actor: Actor, input: { curriculumId: string; code: string; title: string; passingScore?: number; maxAttempts?: number; questions: QuestionInput[] }) {
  const curriculum = await db.curriculum.findFirst({ where: { id: input.curriculumId, tenantId: actor.tenantId, active: true } });
  if (!curriculum) throw new Error('CURRICULUM_NOT_FOUND');
  if (!input.questions.length) throw new Error('QUESTIONS_REQUIRED');
  const assessment = await db.assessment.create({
    data: {
      tenantId: actor.tenantId,
      curriculumId: curriculum.id,
      code: input.code.trim(),
      title: input.title.trim(),
      passingScore: input.passingScore ?? 80,
      maxAttempts: input.maxAttempts ?? 3,
      questions: {
        create: input.questions.map((q) => ({
          sequence: q.sequence,
          type: q.type,
          prompt: q.prompt,
          options: q.options as Prisma.InputJsonValue | undefined,
          correctAnswer: q.correctAnswer as Prisma.InputJsonValue,
          points: q.points ?? 1,
          rationale: q.rationale,
        })),
      },
    },
    include: { questions: { orderBy: { sequence: 'asc' } } },
  });
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'ASSESSMENT_CREATED', entityType: 'Assessment', entityId: assessment.id, after: { code: assessment.code, curriculumId: assessment.curriculumId, passingScore: assessment.passingScore } });
  return assessment;
}

export async function startAssessment(actor: Actor, assessmentId: string, assignmentId: string) {
  const assessment = await db.assessment.findFirst({ where: { id: assessmentId, tenantId: actor.tenantId, active: true }, include: { questions: { orderBy: { sequence: 'asc' } } } });
  if (!assessment) throw new Error('ASSESSMENT_NOT_FOUND');
  const assignment = await db.trainingAssignment.findFirst({ where: { id: assignmentId, membershipId: actor.membershipId, curriculumId: assessment.curriculumId } });
  if (!assignment) throw new Error('ASSIGNMENT_NOT_FOUND');
  const count = await db.assessmentAttempt.count({ where: { assessmentId, membershipId: actor.membershipId } });
  if (count >= assessment.maxAttempts) throw new Error('MAX_ATTEMPTS_REACHED');
  const attempt = await db.assessmentAttempt.create({ data: { assessmentId, assignmentId, membershipId: actor.membershipId, attemptNumber: count + 1 } });
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'ASSESSMENT_STARTED', entityType: 'AssessmentAttempt', entityId: attempt.id, after: { assessmentId, attemptNumber: attempt.attemptNumber } });
  return {
    attempt,
    questions: assessment.questions.map(({ correctAnswer: _correctAnswer, rationale: _rationale, ...q }) => q),
  };
}

export async function submitAssessment(actor: Actor, attemptId: string, answers: Array<{ questionId: string; answer: unknown }>) {
  const attempt = await db.assessmentAttempt.findFirst({
    where: { id: attemptId, membershipId: actor.membershipId, status: 'IN_PROGRESS' },
    include: { assessment: { include: { questions: true } } },
  });
  if (!attempt || attempt.assessment.tenantId !== actor.tenantId) throw new Error('ATTEMPT_NOT_FOUND');
  const answerMap = new Map(answers.map((a) => [a.questionId, a.answer]));
  let possible = 0;
  let awarded = 0;
  const responseData = attempt.assessment.questions.map((q) => {
    const submitted = answerMap.get(q.id);
    if (submitted === undefined) throw new Error('ALL_QUESTIONS_REQUIRED');
    const points = Number(q.points);
    possible += points;
    const correct = stable(submitted) === stable(q.correctAnswer);
    const earned = correct ? points : 0;
    awarded += earned;
    return { questionId: q.id, answer: submitted as Prisma.InputJsonValue, correct, pointsAwarded: earned };
  });
  const score = possible === 0 ? 0 : Number(((awarded / possible) * 100).toFixed(2));
  const passed = score >= attempt.assessment.passingScore;
  await db.$transaction([
    db.assessmentResponse.createMany({ data: responseData.map((r) => ({ ...r, attemptId: attempt.id })) }),
    db.assessmentAttempt.update({ where: { id: attempt.id }, data: { status: passed ? 'PASSED' : 'FAILED', submittedAt: new Date(), score, passed } }),
  ]);
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'ASSESSMENT_SUBMITTED', entityType: 'AssessmentAttempt', entityId: attempt.id, after: { score, passed, attemptNumber: attempt.attemptNumber } });
  return { attemptId: attempt.id, score, passed, passingScore: attempt.assessment.passingScore };
}

export async function configureQualificationRule(actor: Actor, input: { curriculumId: string; knowledgeMinScore?: number; practicalMinScore?: number; minimumSamples?: number; requireTrainingComplete?: boolean; requireSmeSignoff?: boolean; validityDays?: number }) {
  const curriculum = await db.curriculum.findFirst({ where: { id: input.curriculumId, tenantId: actor.tenantId } });
  if (!curriculum) throw new Error('CURRICULUM_NOT_FOUND');
  const rule = await db.qualificationRule.upsert({
    where: { curriculumId: curriculum.id },
    create: { curriculumId: curriculum.id, knowledgeMinScore: input.knowledgeMinScore, practicalMinScore: input.practicalMinScore, minimumSamples: input.minimumSamples ?? 0, requireTrainingComplete: input.requireTrainingComplete ?? true, requireSmeSignoff: input.requireSmeSignoff ?? true, validityDays: input.validityDays },
    update: { knowledgeMinScore: input.knowledgeMinScore, practicalMinScore: input.practicalMinScore, minimumSamples: input.minimumSamples ?? 0, requireTrainingComplete: input.requireTrainingComplete ?? true, requireSmeSignoff: input.requireSmeSignoff ?? true, validityDays: input.validityDays },
  });
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'QUALIFICATION_RULE_CONFIGURED', entityType: 'QualificationRule', entityId: rule.id, after: rule });
  return rule;
}

export async function recordPracticalObservation(actor: Actor, input: { assignmentId: string; membershipId: string; competencyCode: string; sampleCount: number; qualityScore: number; notes?: string; evidenceRef?: string }) {
  const assignment = await db.trainingAssignment.findFirst({ where: { id: input.assignmentId, membershipId: input.membershipId }, include: { membership: true, curriculum: true } });
  if (!assignment || assignment.membership.tenantId !== actor.tenantId) throw new Error('ASSIGNMENT_NOT_FOUND');
  const rule = await db.qualificationRule.findUnique({ where: { curriculumId: assignment.curriculumId } });
  const threshold = rule?.practicalMinScore ? Number(rule.practicalMinScore) : 0;
  const status = input.qualityScore >= threshold ? 'PASSED' : 'FAILED';
  const observation = await db.practicalObservation.create({ data: { assignmentId: assignment.id, membershipId: input.membershipId, assessorUserId: actor.userId, competencyCode: input.competencyCode, sampleCount: input.sampleCount, qualityScore: input.qualityScore, status, notes: input.notes, evidenceRef: input.evidenceRef } });
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'PRACTICAL_OBSERVATION_RECORDED', entityType: 'PracticalObservation', entityId: observation.id, after: { competencyCode: input.competencyCode, sampleCount: input.sampleCount, qualityScore: input.qualityScore, status } });
  return observation;
}

export async function evaluateQualification(actor: Actor, membershipId: string, curriculumId: string) {
  const membership = await db.membership.findFirst({ where: { id: membershipId, tenantId: actor.tenantId, status: 'ACTIVE' } });
  const curriculum = await db.curriculum.findFirst({ where: { id: curriculumId, tenantId: actor.tenantId }, include: { qualificationRule: true } });
  if (!membership || !curriculum || !curriculum.qualificationRule) throw new Error('QUALIFICATION_RULE_NOT_FOUND');
  const rule = curriculum.qualificationRule;
  const assignments = await db.trainingAssignment.findMany({ where: { membershipId, curriculumId }, orderBy: { assignedAt: 'desc' } });
  const latestAssignment = assignments[0];
  const trainingComplete = !rule.requireTrainingComplete || latestAssignment?.status === 'COMPLETED';
  const bestAttempt = await db.assessmentAttempt.findFirst({ where: { membershipId, assessment: { curriculumId }, status: 'PASSED' }, orderBy: { score: 'desc' } });
  const knowledgeScore = bestAttempt?.score ? Number(bestAttempt.score) : null;
  const knowledgePassed = rule.knowledgeMinScore == null || (knowledgeScore != null && knowledgeScore >= Number(rule.knowledgeMinScore));
  const observations = await db.practicalObservation.findMany({ where: { membershipId, assignment: { curriculumId } } });
  const samples = observations.reduce((sum, o) => sum + o.sampleCount, 0);
  const weightedTotal = observations.reduce((sum, o) => sum + Number(o.qualityScore) * o.sampleCount, 0);
  const practicalScore = samples ? Number((weightedTotal / samples).toFixed(2)) : null;
  const practicalPassed = rule.practicalMinScore == null || (practicalScore != null && practicalScore >= Number(rule.practicalMinScore) && samples >= rule.minimumSamples);
  const evidence = { trainingComplete, knowledgeScore, knowledgePassed, practicalScore, practicalPassed, samples, minimumSamples: rule.minimumSamples, requireSmeSignoff: rule.requireSmeSignoff };
  const allEvidencePassed = trainingComplete && knowledgePassed && practicalPassed;
  const existing = await db.qualification.findUnique({ where: { membershipId_curriculumId: { membershipId, curriculumId } } });
  const nextStatus = allEvidencePassed && !rule.requireSmeSignoff ? 'QUALIFIED' : allEvidencePassed ? 'IN_PROGRESS' : 'IN_PROGRESS';
  const now = new Date();
  const validUntil = nextStatus === 'QUALIFIED' && rule.validityDays ? new Date(now.getTime() + rule.validityDays * 86400000) : undefined;
  const qualification = await db.qualification.upsert({
    where: { membershipId_curriculumId: { membershipId, curriculumId } },
    create: { membershipId, curriculumId, status: nextStatus, qualifiedAt: nextStatus === 'QUALIFIED' ? now : undefined, validUntil, lastEvaluatedAt: now, evidenceSnapshot: evidence },
    update: { status: existing?.status === 'QUALIFIED' && allEvidencePassed ? 'QUALIFIED' : nextStatus, qualifiedAt: existing?.qualifiedAt ?? (nextStatus === 'QUALIFIED' ? now : undefined), validUntil: existing?.validUntil ?? validUntil, lastEvaluatedAt: now, evidenceSnapshot: evidence },
  });
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'QUALIFICATION_EVALUATED', entityType: 'Qualification', entityId: qualification.id, before: existing ? { status: existing.status } : undefined, after: { status: qualification.status, evidence } });
  return qualification;
}

export async function signoffQualification(actor: Actor, membershipId: string, curriculumId: string, statement: string) {
  const qualification = await evaluateQualification(actor, membershipId, curriculumId);
  const curriculum = await db.curriculum.findFirst({ where: { id: curriculumId, tenantId: actor.tenantId }, include: { qualificationRule: true } });
  if (!curriculum?.qualificationRule) throw new Error('QUALIFICATION_RULE_NOT_FOUND');
  const evidence = qualification.evidenceSnapshot as Record<string, unknown> | null;
  if (!evidence?.trainingComplete || !evidence?.knowledgePassed || !evidence?.practicalPassed) throw new Error('QUALIFICATION_REQUIREMENTS_NOT_MET');
  if (qualification.signoffSignatureId) throw new Error('ALREADY_SIGNED_OFF');
  const contentHash = createHash('sha256').update(JSON.stringify(evidence)).digest('hex');
  const signature = await db.electronicSignature.create({ data: { userId: actor.userId, meaning: 'QUALIFICATION', entityType: 'Qualification', entityId: qualification.id, statement, contentHash } });
  const now = new Date();
  const validUntil = curriculum.qualificationRule.validityDays ? new Date(now.getTime() + curriculum.qualificationRule.validityDays * 86400000) : null;
  const updated = await db.qualification.update({ where: { id: qualification.id }, data: { status: 'QUALIFIED', signoffSignatureId: signature.id, qualifiedAt: now, validUntil, lastEvaluatedAt: now } });
  await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'QUALIFICATION_SIGNED_OFF', entityType: 'Qualification', entityId: qualification.id, after: { status: 'QUALIFIED', signatureId: signature.id, qualifiedAt: now, validUntil } });
  return updated;
}

export async function getQualification(tenantId: string, membershipId: string, curriculumId: string) {
  const membership = await db.membership.findFirst({ where: { id: membershipId, tenantId } });
  if (!membership) return null;
  return db.qualification.findUnique({ where: { membershipId_curriculumId: { membershipId, curriculumId } }, include: { curriculum: true, signoffSignature: true } });
}
