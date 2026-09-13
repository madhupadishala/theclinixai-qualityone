import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';

const COOKIE_NAME = 'q1_session';
const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? '');

export type QualityOneSession = {
  userId: string;
  tenantId: string;
  membershipId: string;
};

export async function createSessionToken(session: QualityOneSession) {
  if (secret.length < 32) throw new Error('AUTH_SECRET must be at least 32 characters');
  return new SignJWT({ tenantId: session.tenantId, membershipId: session.membershipId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
}

export async function getSession(): Promise<QualityOneSession | null> {
  if (secret.length < 32) return null;
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    if (!payload.sub || typeof payload.tenantId !== 'string' || typeof payload.membershipId !== 'string') return null;
    return { userId: payload.sub, tenantId: payload.tenantId, membershipId: payload.membershipId };
  } catch {
    return null;
  }
}
