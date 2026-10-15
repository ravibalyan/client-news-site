import sanitizeHtml from 'sanitize-html';

export const safeContent = (html: string) => sanitizeHtml(html, {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'h1', 'h2', 'h3', 'figure', 'figcaption'],
  allowedAttributes: { a: ['href', 'name', 'target', 'rel'], img: ['src', 'alt', 'width', 'height'], '*': ['class'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }) }
});
export const escapeHtml = (text = '') => text.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
export function imageSource(value: string | null | undefined) {
  if (!value) return '/images/placeholder.svg';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try { const parsed = new URL(value); if (parsed.protocol === 'https:') return parsed.href; } catch { /* invalid image URL */ }
  return '/images/placeholder.svg';
}
