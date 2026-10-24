import sanitizeHtml from 'sanitize-html';

/** Erlaubtes HTML für Texte aus dem Admin / WordPress-Import (Schutz vor XSS). */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      'a',
      'ul',
      'ol',
      'li',
      'h2',
      'h3',
      'h4',
      'h5',
      'blockquote',
      'span',
      'img',
      'hr',
      'table',
      'thead',
      'tbody',
      'tr',
      'td',
      'th',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading'],
      span: ['style'],
      '*': ['class'],
    },
    allowedStyles: { span: { 'font-weight': [/^\d+$|^bold$/], color: [/^#[0-9a-f]{3,6}$/i] } },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: attribs.target === '_blank' ? { ...attribs, rel: 'noopener noreferrer' } : attribs,
      }),
    },
  });
}
