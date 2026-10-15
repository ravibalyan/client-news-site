import type { APIRoute } from 'astro'; import { db } from '../lib/db';
export const GET: APIRoute = async ({ url }) => {
  const base = url.origin + '/';
  const [articles, pages, categories] = await Promise.all([
    db().prepare("SELECT slug,updated_at FROM articles WHERE status='published' AND published_at<=datetime('now')").all<{slug:string;updated_at:string}>(),
    db().prepare("SELECT slug,updated_at FROM pages WHERE status='published'").all<{slug:string;updated_at:string}>(),
    db().prepare('SELECT slug FROM categories').all<{slug:string}>()
  ]);
  const urls = [...articles.results.map(a=>`<url><loc>${base}article/${a.slug}/</loc><lastmod>${a.updated_at}</lastmod></url>`), ...pages.results.map(p=>`<url><loc>${base}${p.slug}/</loc><lastmod>${p.updated_at}</lastmod></url>`), ...categories.results.map(c=>`<url><loc>${base}category/${c.slug}/</loc></url>`), `<url><loc>${base}</loc></url>`].join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'Content-Type':'application/xml; charset=utf-8' } });
};
