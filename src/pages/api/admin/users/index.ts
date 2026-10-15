import type { APIRoute } from 'astro';
import { db, audit } from '../../../../lib/db';
import { apiUser, passwordHash } from '../../../../lib/auth';

export const POST: APIRoute = async ({ request, url }) => {
  if (request.headers.get('origin') !== url.origin) return new Response('Invalid origin', { status: 403 });
  const actor = await apiUser(request, true); if (actor instanceof Response) return actor;
  const form = await request.formData();
  const name = String(form.get('name') || '').trim().slice(0, 120);
  const email = String(form.get('email') || '').trim().toLowerCase().slice(0, 254);
  const role = String(form.get('role') || 'admin');
  const password = String(form.get('password') || '');
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !['admin','super_admin'].includes(role)) return new Response('Provide a valid name, email, and role.', { status: 400 });
  if (password.length < 12 || password.length > 200) return new Response('Temporary password must be 12–200 characters.', { status: 400 });
  const id = crypto.randomUUID();
  await db().prepare('INSERT INTO admin_users(id,name,email,password_hash,role) VALUES(?,?,?,?,?)').bind(id, name, email, await passwordHash(password), role).run();
  await audit(actor.id, 'admin_created', `${email}:${role}`);
  return new Response(null, { status: 303, headers: { Location: '/admin/users/?created=1' } });
};
