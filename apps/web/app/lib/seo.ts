import type { SiteSettings } from '@hausanna/shared';

interface MetaInput {
  title: string;
  description?: string;
  path: string;
  baseUrl: string;
  image?: string | null;
  settings?: SiteSettings;
}

/** Titel, Beschreibung, Canonical und OpenGraph für eine Seite. */
export function buildMeta({ title, description, path, baseUrl, image, settings }: MetaInput) {
  const url = `${baseUrl}${path}`;
  const img = image ? (image.startsWith('http') ? image : `${baseUrl}${image}`) : undefined;
  const siteName = settings?.info.siteTitle ?? 'Haus Anna Bodenmais';
  return [
    { title },
    ...(description ? [{ name: 'description', content: description }] : []),
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:type', content: 'website' },
    { property: 'og:locale', content: 'de_DE' },
    { property: 'og:site_name', content: siteName },
    { property: 'og:title', content: title },
    { property: 'og:url', content: url },
    ...(description ? [{ property: 'og:description', content: description }] : []),
    ...(img ? [{ property: 'og:image', content: img }] : []),
    { name: 'twitter:card', content: 'summary_large_image' },
  ];
}
