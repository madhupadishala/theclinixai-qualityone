import { db } from './db';

const MS_PER_DAY = 86_400_000;

export async function getExecutiveDashboard(tenantId: string) {
  const now = new Date();
  const [activeUsers, documents, assignments, deviations, capas, qualifications] = await Promise.all([
    db.membership.count({ where: { tenantId, status: 'ACTIVE' } }),
    db.document.findMany({ where: { tenantId }, select: { status: true } }),
    db.trainingAssignment.findMany({ where: { membership: { tenantId } }, select: { status: true, dueAt: true } }),
    db.deviation.findMany({ where: { tenantId }, select: { status: true, severity: true, dueAt: true } }),
    db.capa.findMany({ where: { tenantId }, select: { status: true, dueAt: true, createdAt: true } }),
    db.qualification.findMany({ where: { membership: { tenantId } }, select: { status: true, validUntil: true } }),
  ]);

  const trainingCompleted = assignments.filter((a) => a.status === 'COMPLETED').length;
  const trainingOverdue = assignments.filter((a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && a.dueAt && a.dueAt < now).length;
  const openDeviations = deviations.filter((d) => !['CLOSED', 'VOID'].includes(d.status)).length;
  const criticalOpen = deviations.filter((d) => d.severity === 'CRITICAL' && !['CLOSED', 'VOID'].includes(d.status)).length;
  const openCapas = capas.filter((c) => !['CLOSED', 'CANCELLED'].includes(c.status)).length;
  const overdueCapas = capas.filter((c) => !['CLOSED', 'CANCELLED'].includes(c.status) && c.dueAt && c.dueAt < now).length;
  const qualified = qualifications.filter((q) => q.status === 'QUALIFIED').length;
  const atRisk = qualifications.filter((q) => ['AT_RISK', 'EXPIRED', 'SUSPENDED'].includes(q.status)).length;

  return {
    generatedAt: now.toISOString(),
    people: { activeUsers },
    documents: {
      total: documents.length,
      effective: documents.filter((d) => d.status === 'EFFECTIVE').length,
      inReview: documents.filter((d) => d.status === 'IN_REVIEW').length,
    },
    training: {
      total: assignments.length,
      completed: trainingCompleted,
      overdue: trainingOverdue,
      complianceRate: assignments.length ? Number(((trainingCompleted / assignments.length) * 100).toFixed(1)) : 100,
    },
    qms: { openDeviations, criticalOpen, openCapas, overdueCapas },
    qualification: { total: qualifications.length, qualified, atRisk },
  };
}

export async function getTrainingMatrix(tenantId: string) {
  const memberships = await db.membership.findMany({
    where: { tenantId, status: 'ACTIVE' },
    include: {
      user: true,
      department: true,
      jobRole: true,
      assignments: { include: { curriculum: true }, orderBy: { assignedAt: 'desc' } },
    },
    orderBy: { user: { displayName: 'asc' } },
  });
  const now = new Date();
  return memberships.map((m) => {
    const total = m.assignments.length;
    const completed = m.assignments.filter((a) => a.status === 'COMPLETED').length;
    const overdue = m.assignments.filter((a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && a.dueAt && a.dueAt < now).length;
    return {
      membershipId: m.id,
      learner: m.user.displayName,
      email: m.user.email,
      department: m.department?.name ?? null,
      jobRole: m.jobRole?.name ?? null,
      total,
      completed,
      overdue,
      complianceRate: total ? Number(((completed / total) * 100).toFixed(1)) : 100,
      assignments: m.assignments.map((a) => ({ id: a.id, curriculum: a.curriculum.title, status: a.status, dueAt: a.dueAt, completedAt: a.completedAt })),
    };
  });
}

export async function getCapaAging(tenantId: string) {
  const now = new Date();
  const capas = await db.capa.findMany({
    where: { tenantId, status: { notIn: ['CLOSED', 'CANCELLED'] } },
    include: { owner: true, deviation: { select: { deviationNumber: true, severity: true, title: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return capas.map((c) => ({
    id: c.id,
    capaNumber: c.capaNumber,
    title: c.title,
    type: c.type,
    status: c.status,
    owner: c.owner.displayName,
    deviationNumber: c.deviation.deviationNumber,
    deviationSeverity: c.deviation.severity,
    dueAt: c.dueAt,
    ageDays: Math.max(0, Math.floor((now.getTime() - c.createdAt.getTime()) / MS_PER_DAY)),
    overdueDays: c.dueAt && c.dueAt < now ? Math.max(1, Math.ceil((now.getTime() - c.dueAt.getTime()) / MS_PER_DAY)) : 0,
  }));
}

export async function getQualificationHeatmap(tenantId: string) {
  const qualifications = await db.qualification.findMany({
    where: { membership: { tenantId } },
    include: { membership: { include: { user: true, department: true, jobRole: true } }, curriculum: true },
    orderBy: { membership: { user: { displayName: 'asc' } } },
  });
  return qualifications.map((q) => ({
    qualificationId: q.id,
    membershipId: q.membershipId,
    learner: q.membership.user.displayName,
    department: q.membership.department?.name ?? null,
    jobRole: q.membership.jobRole?.name ?? null,
    curriculum: q.curriculum.title,
    status: q.status,
    qualifiedAt: q.qualifiedAt,
    validUntil: q.validUntil,
    lastEvaluatedAt: q.lastEvaluatedAt,
  }));
}

export async function getInspectionEvidenceSnapshot(tenantId: string) {
  const [dashboard, auditEvents, signatures, trainingRecords, deviations, capas] = await Promise.all([
    getExecutiveDashboard(tenantId),
    db.auditEvent.findMany({ where: { tenantId }, orderBy: { occurredAt: 'desc' }, take: 250 }),
    db.electronicSignature.findMany({ where: { user: { memberships: { some: { tenantId } } } }, orderBy: { signedAt: 'desc' }, take: 250 }),
    db.trainingRecord.findMany({ where: { membership: { tenantId } }, orderBy: { completedAt: 'desc' }, take: 250 }),
    db.deviation.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 100 }),
    db.capa.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 100 }),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    dashboard,
    evidenceCounts: { auditEvents: auditEvents.length, signatures: signatures.length, trainingRecords: trainingRecords.length, deviations: deviations.length, capas: capas.length },
    auditEvents,
    signatures,
    trainingRecords,
    deviations,
    capas,
  };
}
