import type { APIRoute } from 'astro'; import { revokeSession, clearCookie, currentUser } from '../../../lib/auth'; import { audit } from '../../../lib/db';
export const POST: APIRoute = async ({request,url}) => {
  if (request.headers.get('origin') !== url.origin) return new Response('Invalid request origin',{status:403});
  const user = await currentUser(request); await revokeSession(request); if (user) await audit(user.id,'logout');
  return new Response(null,{status:303,headers:{Location:'/admin/login/','Set-Cookie':clearCookie(url.protocol==='https:')}});
};
