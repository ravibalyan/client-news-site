import type { APIRoute } from 'astro';
import { db, audit } from '../../../lib/db';
import { apiUser, cookie, makeSession, passwordHash, verifyPassword } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, url }) => {
  if (request.headers.get('origin') !== url.origin) return new Response('Invalid request origin', { status: 403 });
  const form = await request.formData();
  const email = String(form.get('email') || '').trim().toLowerCase().slice(0,254);
  const password = String(form.get('password') || '').slice(0,200);
  const identity = `${email}|${request.headers.get('cf-connecting-ip') || 'local'}`;
  const state = await db().prepare('SELECT attempts,window_started,blocked_until FROM login_attempts WHERE identity=?').bind(identity).first<{attempts:number;window_started:string;blocked_until:string|null}>();
  if (state?.blocked_until && new Date(state.blocked_until+' UTC') > new Date()) return new Response('Too many attempts. Try again later.', { status: 429 });
  const user = await db().prepare('SELECT id,name,email,role,password_hash,active FROM admin_users WHERE email=? COLLATE NOCASE').bind(email).first<{id:string;name:string;email:string;role:string;password_hash:string;active:number}>();
  const valid = !!user && user.active === 1 && await verifyPassword(password,user.password_hash);
  if (!valid) {
    const attempts = state && Date.now()-Date.parse(state.window_started+' UTC') < 15*60*1000 ? state.attempts+1 : 1;
    await db().prepare(`INSERT INTO login_attempts(identity,attempts,window_started,blocked_until) VALUES(?,?,datetime('now'),CASE WHEN ?>7 THEN datetime('now','+15 minutes') ELSE NULL END)
      ON CONFLICT(identity) DO UPDATE SET attempts=excluded.attempts,window_started=excluded.window_started,blocked_until=CASE WHEN excluded.attempts>7 THEN datetime('now','+15 minutes') ELSE NULL END`).bind(identity,attempts,attempts).run();
    return new Response('Email or password is incorrect.', { status: 401 });
  }
  await db().prepare('DELETE FROM login_attempts WHERE identity=?').bind(identity).run();
  const token = await makeSession(user.id); await audit(user.id,'login');
  return new Response(null,{status:303,headers:{Location:'/admin/', 'Set-Cookie':cookie(token,url.protocol==='https:')}});
};

export const PUT: APIRoute = async ({ request, url }) => {
  if (request.headers.get('origin') !== url.origin) return new Response('Invalid request origin', { status:403 });
  const authorized = await apiUser(request); if (authorized instanceof Response) return authorized; const user = authorized;
  const body = await request.formData();
  const current = String(body.get('current_password') || ''); const next = String(body.get('new_password') || '');
  const row = await db().prepare('SELECT password_hash FROM admin_users WHERE id=?').bind(user.id).first<{password_hash:string}>();
  if (!row || !(await verifyPassword(current,row.password_hash))) return new Response('Current password is incorrect.',{status:400});
  if (next.length < 12 || next.length > 200) return new Response('Use a password between 12 and 200 characters.',{status:400});
  await db().prepare("UPDATE admin_users SET password_hash=?,password_changed_at=datetime('now'),updated_at=datetime('now') WHERE id=?").bind(await passwordHash(next),user.id).run();
  await db().prepare('DELETE FROM sessions WHERE user_id=?').bind(user.id).run(); await audit(user.id,'password_changed');
  const token = await makeSession(user.id); return new Response(null,{status:303,headers:{Location:'/admin/password/?saved=1','Set-Cookie':cookie(token,url.protocol==='https:')}});
};
