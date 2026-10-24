import { data, redirect } from 'react-router';
import type { Route } from './+types/slug';
import { AccommodationView } from '../components/AccommodationView';
import { Blocks } from '../components/Blocks';
import { fetchAccommodation, fetchPage, orNull } from '../lib/api.server';
import { stripHtml, truncateWords } from '../lib/format';
import { enforceTrailingSlash, LEGACY_TO_HOME } from '../lib/redirects.server';
import { buildMeta } from '../lib/seo';
import type { PublicSite } from '../lib/types';
import { useRootData } from '../root';

export async function loader({ params, request }: Route.LoaderArgs) {
  const slug = params.slug.toLowerCase();
  if (LEGACY_TO_HOME.has(slug)) throw redirect('/', 301);
  if (slug === 'home') throw redirect('/', 301);
  enforceTrailingSlash(request);
  const accommodation = await orNull(fetchAccommodation(slug));
  if (accommodation) return { kind: 'accommodation' as const, detail: accommodation };
  const page = await orNull(fetchPage(slug));
  if (page) return { kind: 'page' as const, page };
  throw data('Seite nicht gefunden', { status: 404 });
}

type RootLoader = { site: PublicSite; baseUrl: string };

export function meta({ loaderData, matches, params }: Route.MetaArgs) {
  const root = matches[0]?.loaderData as RootLoader | undefined;
  const base = {
    path: `/${params.slug}/`,
    baseUrl: root?.baseUrl ?? '',
    settings: root?.site.settings,
  };
  const suffix = root?.site.settings.info.siteTitle ?? 'Haus Anna Bodenmais';
  if (!loaderData) return [{ title: `Seite nicht gefunden – ${suffix}` }];
  if (loaderData.kind === 'accommodation') {
    const a = loaderData.detail.accommodation;
    return buildMeta({
      ...base,
      title: `${a.name} – ${suffix}`,
      description: truncateWords(stripHtml(a.teaser || a.descriptionHtml), 155),
      image: a.coverImage?.url,
    });
  }
  const p = loaderData.page;
  const firstText = p.blocks.find((b) => b.type === 'richText');
  return buildMeta({
    ...base,
    title: p.metaTitle || `${p.title} – ${suffix}`,
    description:
      p.metaDescription ||
      (firstText?.type === 'richText' ? truncateWords(stripHtml(firstText.html), 155) : ''),
  });
}

export default function SlugPage({ loaderData }: Route.ComponentProps) {
  const root = useRootData();
  if (!root) return null;
  if (loaderData.kind === 'accommodation') {
    return (
      <AccommodationView
        key={loaderData.detail.accommodation.id}
        detail={loaderData.detail}
        site={root.site}
        baseUrl={root.baseUrl}
      />
    );
  }
  return (
    <div className={`page page--${loaderData.page.slug}`}>
      <Blocks blocks={loaderData.page.blocks} site={root.site} />
    </div>
  );
}
