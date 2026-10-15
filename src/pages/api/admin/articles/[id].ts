import type { APIRoute } from 'astro'; import { db,audit } from '../../../../lib/db'; import { apiUser } from '../../../../lib/auth';
export const POST: APIRoute = async ({request,url,params}) => {
  if(request.headers.get('origin')!==url.origin)return new Response('Invalid request origin',{status:403}); const authorized=await apiUser(request);if(authorized instanceof Response)return authorized;const user=authorized; const f=await request.formData(); const action=String(f.get('action')||'');
  if(action==='delete'){await db().prepare('DELETE FROM articles WHERE id=?').bind(params.id).run();await audit(user.id,'article_deleted',String(params.id));}
  else {const status=action==='publish'?'published':'draft';await db().prepare("UPDATE articles SET status=?,published_at=CASE WHEN ?='published' THEN COALESCE(published_at,datetime('now')) ELSE NULL END,updated_at=datetime('now') WHERE id=?").bind(status,status,params.id).run();await audit(user.id,`article_${status}`,String(params.id));}
  return new Response(null,{status:303,headers:{Location:'/admin/articles/'}});
};
