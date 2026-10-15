import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { db, audit } from '../../../lib/db';
import { apiUser } from '../../../lib/auth';

const signatures: Record<string, (b: Uint8Array) => boolean> = {
  'image/jpeg': b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/gif': b => String.fromCharCode(...b.slice(0, 6)).startsWith('GIF8'),
  'image/webp': b => String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP'
};

export const POST: APIRoute = async ({ request, url }) => {
  if (request.headers.get('origin') !== url.origin) return new Response('Invalid origin', { status: 403 });
  const user = await apiUser(request); if (user instanceof Response) return user;
  const file = (await request.formData()).get('file');
  if (!(file instanceof File) || file.size < 1 || file.size > 5 * 1024 * 1024) return new Response('Choose an image up to 5 MB.', { status: 400 });
  const signature = signatures[file.type];
  if (!signature) return new Response('Only JPEG, PNG, WebP, and GIF images are allowed.', { status: 415 });
  if (!signature(new Uint8Array(await file.slice(0, 12).arrayBuffer()))) return new Response('The file content does not match its image type.', { status: 415 });
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[file.type] || 'img';
  const key = `uploads/${crypto.randomUUID()}.${ext}`;
  await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' } });
  const id = crypto.randomUUID();
  await db().prepare('INSERT INTO media(id,key,filename,content_type,size,created_by) VALUES(?,?,?,?,?,?)')
    .bind(id, key, file.name.replace(/[\\/]/g, '').slice(0, 200), file.type, file.size, user.id).run();
  await audit(user.id, 'media_uploaded', key);
  return new Response(null, { status: 303, headers: { Location: '/admin/media/?uploaded=1' } });
};
