import type { APIRoute } from 'astro';
import { db, audit } from '../../../lib/db';
import { apiUser } from '../../../lib/auth';

const allowed = new Set(['site_name','site_tagline','admin_email','default_seo_title','default_seo_description','default_social_image','logo_url','ads_enabled','ads_publisher','ads_slot','ads_placement','head_scripts_enabled','head_scripts_code','body_start_code']);
const limits: Record<string, number> = { head_scripts_code:16000, body_start_code:6000, default_seo_description:320, site_name:100, site_tagline:200, admin_email:254, ads_publisher:100, ads_slot:100, logo_url:1000, default_social_image:1000, default_seo_title:200 };

export const POST: APIRoute = async ({ request, url }) => {
  if (request.headers.get('origin') !== url.origin) return new Response('Invalid origin', { status: 403 });
  const user = await apiUser(request, true); if (user instanceof Response) return user;
  const form = await request.formData();
  for (const [key, value] of form.entries()) {
    if (!allowed.has(key) || typeof value !== 'string') continue;
    let text = value.trim().slice(0, limits[key] || 500);
    if (['ads_enabled','head_scripts_enabled'].includes(key)) text = text === 'true' ? 'true' : 'false';
    if (key === 'ads_placement' && !['after_intro','after_content'].includes(text)) text = 'after_intro';
    await db().prepare("INSERT INTO settings(key,value,updated_by) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=datetime('now')")
      .bind(key, text, user.id).run();
  }
  await audit(user.id, 'privileged_settings_updated', 'Website, advertising, or scripts');
  return new Response(null, { status: 303, headers: { Location: '/admin/settings/?saved=1' } });
};
