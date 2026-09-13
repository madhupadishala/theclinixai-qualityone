import { db } from './db';
import { appendAuditEvent } from './audit';

type Actor = { tenantId: string; userId: string; membershipId: string };

type CurriculumInput = {
  code: string;
  title: string;
  jobRoleId?: string;
  items: Array<{ documentId: string; required?: boolean; sequence: number; passingScore?: number }>;
};

export async function createCurriculum(actor: Actor, input: CurriculumInput) {
  return db.$transaction(async (tx) => {
    if (input.jobRoleId) {
      const role = await tx.jobRole.findFirst({ where: { id: input.jobRoleId, tenantId: actor.tenantId } });
      if (!role) throw new Error('JOB_ROLE_NOT_FOUND');
    }

    const docs = await tx.document.findMany({
      where: { tenantId: actor.tenantId, id: { in: input.items.map((i) => i.documentId) }, status: 'EFFECTIVE' },
      include: { currentVersion: true },
    });
    if (docs.length !== input.items.length || docs.some((d) => !d.currentVersion?.effectiveAt)) throw new Error('ONLY_EFFECTIVE_DOCUMENTS_ALLOWED');

    const curriculum = await tx.curriculum.create({
      data: { tenantId: actor.tenantId, jobRoleId: input.jobRoleId, code: input.code.trim(), title: input.title.trim() },
    });

    const byId = new Map(docs.map((d) => [d.id, d]));
    for (const item of input.items) {
      const document = byId.get(item.documentId)!;
      await tx.curriculumItem.create({
        data: {
          curriculumId: curriculum.id,
          documentId: document.id,
          documentVersionId: document.currentVersion!.id,
          sequence: item.sequence,
          required: item.required ?? true,
          passingScore: item.passingScore,
        },
      });
    }

    await tx.auditEvent.create({
      data: {
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
        action: 'CURRICULUM_CREATED',
        entityType: 'Curriculum',
        entityId: curriculum.id,
        after: { code: curriculum.code, title: curriculum.title, itemCount: input.items.length },
        eventHash: `${curriculum.id}:${Date.now()}:${actor.userId}`,
      },
    });

    return curriculum;
  });
}

export async function assignCurriculum(actor: Actor, input: { curriculumId: string; membershipIds?: string[]; dueAt?: Date }) {
  const curriculum = await db.curriculum.findFirst({ where: { id: input.curriculumId, tenantId: actor.tenantId, active: true } });
  if (!curriculum) throw new Error('CURRICULUM_NOT_FOUND');

  const memberships = input.membershipIds?.length
    ? await db.membership.findMany({ where: { tenantId: actor.tenantId, id: { in: input.membershipIds }, status: 'ACTIVE' } })
    : curriculum.jobRoleId
      ? await db.membership.findMany({ where: { tenantId: actor.tenantId, jobRoleId: curriculum.jobRoleId, status: 'ACTIVE' } })
      : [];

  if (!memberships.length) throw new Error('NO_ELIGIBLE_LEARNERS');

  const created = [];
  for (const membership of memberships) {
    const existing = await db.trainingAssignment.findFirst({
      where: { membershipId: membership.id, curriculumId: curriculum.id, status: { in: ['ASSIGNED', 'IN_PROGRESS', 'OVERDUE'] } },
    });
    if (existing) continue;
    const assignment = await db.trainingAssignment.create({
      data: { membershipId: membership.id, curriculumId: curriculum.id, dueAt: input.dueAt },
    });
    created.push(assignment);
    await appendAuditEvent({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'TRAINING_ASSIGNED', entityType: 'TrainingAssignment', entityId: assignment.id, after: { membershipId: membership.id, curriculumId: curriculum.id, dueAt: input.dueAt?.toISOString() } });
  }
  return created;
}

export async function getMyTraining(actor: Actor) {
  const now = new Date();
  const assignments = await db.trainingAssignment.findMany({
    where: { membershipId: actor.membershipId },
    include: {
      curriculum: { include: { items: { orderBy: { sequence: 'asc' }, include: { document: true, documentVersion: true } } } },
      records: true,
    },
    orderBy: { assignedAt: 'desc' },
  });

  return Promise.all(assignments.map(async (assignment) => {
    let status = assignment.status;
    if (assignment.dueAt && assignment.dueAt < now && !['COMPLETED', 'CANCELLED'].includes(status)) {
      status = 'OVERDUE';
      if (assignment.status !== 'OVERDUE') await db.trainingAssignment.update({ where: { id: assignment.id }, data: { status: 'OVERDUE' } });
    }
    const required = assignment.curriculum.items.filter((i) => i.required);
    const completedIds = new Set(assignment.records.map((r) => r.curriculumItemId));
    return { ...assignment, status, progress: { completed: required.filter((i) => completedIds.has(i.id)).length, total: required.length } };
  }));
}

export async function acknowledgeTraining(actor: Actor, input: { assignmentId: string; curriculumItemId: string; statement: string }) {
  const assignment = await db.trainingAssignment.findFirst({
    where: { id: input.assignmentId, membershipId: actor.membershipId },
    include: { curriculum: { include: { items: { include: { document: true, documentVersion: true } } } }, records: true },
  });
  if (!assignment || ['COMPLETED', 'CANCELLED'].includes(assignment.status)) throw new Error('ASSIGNMENT_NOT_ACTIVE');
  const item = assignment.curriculum.items.find((i) => i.id === input.curriculumItemId);
  if (!item || !item.document || !item.documentVersion) throw new Error('TRAINING_ITEM_NOT_FOUND');
  if (!item.documentVersion.effectiveAt) throw new Error('DOCUMENT_VERSION_NOT_EFFECTIVE');
  const existing = assignment.records.find((r) => r.curriculumItemId === item.id);
  if (existing) throw new Error('ALREADY_COMPLETED');

  const signature = await db.electronicSignature.create({
    data: {
      userId: actor.userId,
      meaning: 'ACKNOWLEDGEMENT',
      entityType: 'DocumentVersion',
      entityId: item.documentVersion.id,
      statement: input.statement,
      contentHash: item.documentVersion.contentHash,
    },
  });

  const record = await db.trainingRecord.create({
    data: {
      assignmentId: assignment.id,
      curriculumItemId: item.id,
      membershipId: actor.membershipId,
      documentVersionId: item.documentVersion.id,
      signatureId: signature.id,
      completedAt: new Date(),
      evidenceHash: item.documentVersion.contentHash,
    },
  });

  const requiredIds = assignment.curriculum.items.filter((i) => i.required).map((i) => i.id);
  const completed = new Set([...assignment.records.map((r) => r.curriculumItemId), item.id]);
  const isComplete = requiredIds.every((id) => completed.has(id));
  await db.trainingAssignment.update({
    where: { id: assignment.id },
    data: { status: isComplete ? 'COMPLETED' : 'IN_PROGRESS', completedAt: isComplete ? new Date() : null },
  });

  await appendAuditEvent({
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    action: 'TRAINING_ACKNOWLEDGED',
    entityType: 'TrainingRecord',
    entityId: record.id,
    after: { assignmentId: assignment.id, documentVersionId: item.documentVersion.id, contentHash: item.documentVersion.contentHash, signatureId: signature.id, assignmentCompleted: isComplete },
  });

  return { record, assignmentCompleted: isComplete };
}

export async function getComplianceDashboard(tenantId: string) {
  const assignments = await db.trainingAssignment.findMany({
    where: { membership: { tenantId } },
    include: { membership: { include: { user: true, jobRole: true, department: true } }, curriculum: true },
    orderBy: { dueAt: 'asc' },
  });
  const now = new Date();
  const normalized = assignments.map((a) => ({
    id: a.id,
    learner: a.membership.user.displayName,
    email: a.membership.user.email,
    jobRole: a.membership.jobRole?.name ?? null,
    department: a.membership.department?.name ?? null,
    curriculum: a.curriculum.title,
    dueAt: a.dueAt,
    status: a.status === 'COMPLETED' ? 'COMPLETED' : a.dueAt && a.dueAt < now ? 'OVERDUE' : a.status,
  }));
  return {
    summary: {
      total: normalized.length,
      completed: normalized.filter((a) => a.status === 'COMPLETED').length,
      overdue: normalized.filter((a) => a.status === 'OVERDUE').length,
      open: normalized.filter((a) => !['COMPLETED', 'OVERDUE'].includes(a.status)).length,
    },
    assignments: normalized,
  };
}
