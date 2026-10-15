import type { APIRoute } from 'astro';
import { db, audit } from '../../../../lib/db';
import { apiUser, passwordHash } from '../../../../lib/auth';

export const POST: APIRoute = async ({ request, url, params }) => {
  if (request.headers.get('origin') !== url.origin) return new Response('Invalid origin', { status: 403 });
  const actor = await apiUser(request, true); if (actor instanceof Response) return actor;
  const form = await request.formData();
  const action = String(form.get('action') || '');
  const id = String(params.id);
  const target = await db().prepare('SELECT id,name,email,role,active FROM admin_users WHERE id=?').bind(id)
    .first<{id:string;name:string;email:string;role:string;active:number}>();
  if (!target) return new Response('Account not found', { status: 404 });

  if (action === 'delete') {
    if (id === actor.id) return new Response('You cannot delete your own account.', { status: 400 });
    const removed = await db().prepare("DELETE FROM admin_users WHERE id=? AND (role!='super_admin' OR active!=1 OR (SELECT COUNT(*) FROM admin_users WHERE role='super_admin' AND active=1)>1)").bind(id).run();
    if (!removed.meta.changes) return new Response('The last active Super Admin cannot be removed.', { status: 409 });
    await audit(actor.id, 'admin_deleted', target.email);
  } else if (action === 'reset') {
    const password = String(form.get('password') || '');
    if (password.length < 12 || password.length > 200) return new Response('New password must be 12–200 characters.', { status: 400 });
    await db().prepare("UPDATE admin_users SET password_hash=?,password_changed_at=datetime('now'),updated_at=datetime('now') WHERE id=?").bind(await passwordHash(password), id).run();
    await db().prepare('DELETE FROM sessions WHERE user_id=?').bind(id).run();
    await audit(actor.id, 'admin_password_reset', target.email);
  } else if (action === 'update') {
    const name = String(form.get('name') || '').trim().slice(0, 120);
    const email = String(form.get('email') || '').trim().toLowerCase().slice(0, 254);
    const role = String(form.get('role') || 'admin');
    const active = form.get('active') === '1' ? 1 : 0;
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || !['admin','super_admin'].includes(role)) return new Response('Invalid account fields.', { status: 400 });
    if (id === actor.id && (role !== 'super_admin' || active !== 1)) return new Response('You cannot remove your own Super Admin access.', { status: 400 });
    const updated = await db().prepare("UPDATE admin_users SET name=?,email=?,role=?,active=?,updated_at=datetime('now') WHERE id=? AND (role!='super_admin' OR active!=1 OR (?='super_admin' AND ?=1) OR (SELECT COUNT(*) FROM admin_users WHERE role='super_admin' AND active=1)>1)").bind(name, email, role, active, id, role, active).run();
    if (!updated.meta.changes) return new Response('The last active Super Admin cannot be changed.', { status: 409 });
    if (!active) await db().prepare('DELETE FROM sessions WHERE user_id=?').bind(id).run();
    await audit(actor.id, 'admin_updated', `${email}:${role}:${active}`);
  } else return new Response('Unsupported action', { status: 400 });

  return new Response(null, { status: 303, headers: { Location: '/admin/users/?saved=1' } });
};
