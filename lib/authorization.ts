import { db } from './db';
import { getSession } from './session';

export async function requireActiveMembership() {
  const session = await getSession();
  if (!session) throw new Error('UNAUTHENTICATED');
  const membership = await db.membership.findFirst({
    where: { id: session.membershipId, tenantId: session.tenantId, userId: session.userId, status: 'ACTIVE' },
  });
  if (!membership) throw new Error('UNAUTHORIZED');
  return { session, membership };
}

export async function requirePermission(permissionCode: string) {
  const { session, membership } = await requireActiveMembership();
  const granted = await db.membershipRole.findFirst({
    where: {
      membershipId: membership.id,
      role: { permissions: { some: { permission: { code: permissionCode } } } },
    },
    select: { membershipId: true },
  });
  if (!granted) throw new Error('FORBIDDEN');
  return session;
}
