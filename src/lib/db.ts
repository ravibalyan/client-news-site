import { env } from 'cloudflare:workers';

export type DB = D1Database;
export const db = (): DB => env.DB as DB;

export async function setting(key: string, fallback = ''): Promise<string> {
  const row = await db().prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>();
  return row?.value ?? fallback;
}

export async function audit(userId: string | null, action: string, detail = '') {
  await db().prepare('INSERT INTO audit_log(id,user_id,action,detail) VALUES(?,?,?,?)')
    .bind(crypto.randomUUID(), userId, action, detail.slice(0, 500)).run();
}
