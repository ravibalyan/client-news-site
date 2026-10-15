import { db } from './db';

export type Article = { id: string; title: string; slug: string; excerpt: string; content: string; image_url: string; image_alt: string; author_name: string; status: string; published_at: string | null; updated_at: string; seo_title: string; seo_description: string; category_name?: string; category_slug?: string };
export async function articles(limit = 12, offset = 0, category?: string, search?: string) {
  let sql = `SELECT a.*, (SELECT c.name FROM article_categories ac JOIN categories c ON c.id=ac.category_id WHERE ac.article_id=a.id LIMIT 1) category_name,
    (SELECT c.slug FROM article_categories ac JOIN categories c ON c.id=ac.category_id WHERE ac.article_id=a.id LIMIT 1) category_slug
    FROM articles a WHERE a.status='published' AND a.published_at <= datetime('now')`;
  const args: unknown[] = [];
  if (category) { sql += ' AND EXISTS (SELECT 1 FROM article_categories ac JOIN categories c ON c.id=ac.category_id WHERE ac.article_id=a.id AND c.slug=?)'; args.push(category); }
  if (search) { sql += ' AND (a.title LIKE ? OR a.excerpt LIKE ? OR a.content LIKE ?)'; const q = `%${search.slice(0,100)}%`; args.push(q,q,q); }
  sql += ' ORDER BY a.published_at DESC LIMIT ? OFFSET ?'; args.push(Math.max(1,Math.min(limit,50)), Math.max(0,offset));
  return (await db().prepare(sql).bind(...args).all<Article>()).results;
}
export async function categories() {
  return (await db().prepare("SELECT c.*,COUNT(CASE WHEN a.status='published' AND a.published_at<=datetime('now') THEN ac.article_id END) article_count FROM categories c LEFT JOIN article_categories ac ON ac.category_id=c.id LEFT JOIN articles a ON a.id=ac.article_id GROUP BY c.id ORDER BY c.name").all()).results as { id:string; name:string; slug:string; description:string; article_count:number }[];
}
export async function getArticle(slug: string) {
  return await db().prepare(`SELECT a.*,(SELECT c.name FROM article_categories ac JOIN categories c ON c.id=ac.category_id WHERE ac.article_id=a.id LIMIT 1) category_name,
    (SELECT c.slug FROM article_categories ac JOIN categories c ON c.id=ac.category_id WHERE ac.article_id=a.id LIMIT 1) category_slug
    FROM articles a WHERE a.slug=? AND a.status='published' AND a.published_at <= datetime('now')`).bind(slug).first<Article>();
}
