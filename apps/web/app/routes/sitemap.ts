import { fetchSite, publicBaseUrl } from '../lib/api.server';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export async function loader() {
  const site = await fetchSite();
  const base = publicBaseUrl();
  const paths = [
    '/',
    ...site.accommodations.map((a) => `/${a.slug}/`),
    ...site.menuPages.map((p) => `/${p.slug}/`),
    ...site.footerPages.map((p) => `/${p.slug}/`),
  ];
  const unique = [...new Set(paths)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${unique
    .map((p) => `  <url><loc>${esc(base + p)}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
