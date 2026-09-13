export function assertSegregationOfDuties(reviewerUserId: string, approverUserId: string) {
  if (reviewerUserId === approverUserId) throw new Error('SEGREGATION_OF_DUTIES_REQUIRED');
}

export function deriveQualificationRisk(input: { wasQualified: boolean; criticalFailure: boolean; requirementsMet: boolean }) {
  if (!input.wasQualified) return 'IN_PROGRESS' as const;
  if (input.criticalFailure) return 'SUSPENDED' as const;
  if (!input.requirementsMet) return 'AT_RISK' as const;
  return 'QUALIFIED' as const;
}
