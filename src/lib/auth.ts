import { db } from './db';

const encoder = new TextEncoder();
const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const digest = async (value: string) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));

export async function passwordHash(password: string, salt: string = crypto.randomUUID()) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 310000, hash: 'SHA-256' }, material, 256);
  return `pbkdf2$310000$${salt}$${hex(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, rounds, salt, expected] = stored.split('$');
  if (scheme !== 'pbkdf2' || !salt || !expected || Number(rounds) !== 310000) return false;
  const actual = await passwordHash(password, salt);
  return actual === stored;
}

export type User = { id: string; name: string; email: string; role: 'super_admin' | 'admin'; active: number };

export async function currentUser(request: Request): Promise<User | null> {
  const token = request.headers.get('cookie')?.match(/(?:^|;\s*)news_session=([A-Za-z0-9_-]+)/)?.[1];
  if (!token) return null;
  const result = await db().prepare(`SELECT u.id,u.name,u.email,u.role,u.active FROM sessions s
    JOIN admin_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at > datetime('now') AND u.active=1`)
    .bind(await digest(token)).first<User>();
  return result ?? null;
}

export const requireUser = async (request: Request) => {
  const user = await currentUser(request);
  if (!user) throw new Response('Authentication required', { status: 401 });
  return user;
};
export const requireSuperAdmin = async (request: Request) => {
  const user = await requireUser(request);
  if (user.role !== 'super_admin') throw new Response('Forbidden', { status: 403 });
  return user;
};
export async function apiUser(request: Request, superAdmin = false): Promise<User | Response> {
  const user = await currentUser(request);
  if (!user) return new Response('Authentication required', { status: 401 });
  if (superAdmin && user.role !== 'super_admin') return new Response('Forbidden', { status: 403 });
  return user;
}
export async function makeSession(userId: string) {
  const token = `${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '')}`;
  await db().prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,datetime(\'now\',\'+7 days\'))')
    .bind(await digest(token), userId).run();
  return token;
}
export async function revokeSession(request: Request) {
  const token = request.headers.get('cookie')?.match(/(?:^|;\s*)news_session=([A-Za-z0-9_-]+)/)?.[1];
  if (token) await db().prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();
}
export const cookie = (token: string, secure = true) => `news_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure ? '; Secure' : ''}`;
export const clearCookie = (secure = true) => `news_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
