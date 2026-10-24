import type { Route } from './+types/home';
import { Blocks } from '../components/Blocks';
import { fetchPage, orNull } from '../lib/api.server';
import { stripHtml, truncateWords } from '../lib/format';
import { buildMeta } from '../lib/seo';
import { useRootData } from '../root';

export async function loader() {
  return { page: await orNull(fetchPage('home')) };
}

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const root = matches[0]?.loaderData as
    { site: import('../lib/types').PublicSite; baseUrl: string } | undefined;
  const page = loaderData?.page;
  const firstText = page?.blocks.find((b) => b.type === 'richText');
  const description =
    page?.metaDescription ||
    (firstText && firstText.type === 'richText'
      ? truncateWords(stripHtml(firstText.html), 155)
      : '');
  return buildMeta({
    title: page?.metaTitle || root?.site.settings.info.siteTitle || 'Haus Anna Bodenmais',
    description,
    path: '/',
    baseUrl: root?.baseUrl ?? '',
    image: root?.site.settings.design.headerImage?.url,
    settings: root?.site.settings,
  });
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const root = useRootData();
  if (!root) return null;
  const { page } = loaderData;
  if (!page) {
    return (
      <section className="section">
        <div className="row">
          <h1 className="page-title">{root.site.settings.info.siteTitle}</h1>
        </div>
      </section>
    );
  }
  return (
    <div className="page page--home">
      <Blocks blocks={page.blocks} site={root.site} />
    </div>
  );
}
