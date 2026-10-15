export const GET = () => new Response('User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: /sitemap.xml\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
