import { db } from './db';

export async function hasPermission(tenantId: string, userId: string, permissionCode: string) {
  const membership = await db.membership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    include: { roleGrants: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  });
  if (!membership || membership.status !== 'ACTIVE') return false;
  return membership.roleGrants.some((grant) => grant.role.permissions.some((rp) => rp.permission.code === permissionCode));
}
