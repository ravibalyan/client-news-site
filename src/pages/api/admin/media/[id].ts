import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { db, audit } from '../../../../lib/db';
import { apiUser } from '../../../../lib/auth';

export const POST: APIRoute = async ({ request, url, params }) => {
  if (request.headers.get('origin') !== url.origin) return new Response('Invalid origin', { status: 403 });
  const user = await apiUser(request); if (user instanceof Response) return user;
  const row = await db().prepare('SELECT key FROM media WHERE id=?').bind(params.id).first<{key:string}>();
  if (row) {
    await env.MEDIA.delete(row.key);
    await db().prepare('DELETE FROM media WHERE id=?').bind(params.id).run();
    await audit(user.id, 'media_deleted', row.key);
  }
  return new Response(null, { status: 303, headers: { Location: '/admin/media/' } });
};
