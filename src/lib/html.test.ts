import { describe, expect, it } from 'vitest';
import { safeContent, escapeHtml, imageSource } from './html';

describe('safeContent', () => {
  it('removes executable markup while preserving editorial HTML', () => {
    expect(safeContent('<h2>Hello</h2><script>alert(1)</script><p onclick="x()">Story</p>')).toBe('<h2>Hello</h2><p>Story</p>');
  });
  it('rejects javascript links', () => {
    expect(safeContent('<a href="javascript:alert(1)">link</a>')).not.toContain('javascript:');
  });
});

describe('escapeHtml', () => {
  it('escapes text content', () => expect(escapeHtml('<img src=x>')).toBe('&lt;img src=x&gt;'));
});

describe('imageSource', () => {
  it('accepts local and HTTPS image paths', () => {
    expect(imageSource('/media/uploads/picture.webp')).toBe('/media/uploads/picture.webp');
    expect(imageSource('https://images.example.test/photo.jpg')).toBe('https://images.example.test/photo.jpg');
  });
  it('uses a placeholder for non-HTTP or malformed URLs', () => {
    expect(imageSource('javascript:alert(1)')).toBe('/images/placeholder.svg');
    expect(imageSource('//evil.example/image.png')).toBe('/images/placeholder.svg');
  });
});
