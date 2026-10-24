import '@fontsource/open-sans/400.css';
import '@fontsource/open-sans/400-italic.css';
import '@fontsource/open-sans/500.css';
import '@fontsource/open-sans/600.css';
import '@fontsource/open-sans/700.css';
import '@fontsource/montez/400.css';
import '@fontsource/lato/400.css';
import '@fontsource/lato/700.css';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/source-sans-3/700.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@fontsource/dancing-script/400.css';
import '@fontsource/great-vibes/400.css';
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router';
import type { DesignSettings } from '@hausanna/shared';
import type { Route } from './+types/root';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { fetchSite, publicBaseUrl } from './lib/api.server';
import type { PublicSite } from './lib/types';
import './app.css';

export async function loader() {
  return { site: await fetchSite(), baseUrl: publicBaseUrl(), year: new Date().getFullYear() };
}

export type RootData = Awaited<ReturnType<typeof loader>>;

export function useRootData(): RootData | undefined {
  return useRouteLoaderData<RootData>('root');
}

/** Design-Einstellungen aus dem Admin → CSS-Variablen */
export function designCss(d: DesignSettings): string {
  const c = d.colors;
  return `:root{--c-text:${c.text};--c-heading-muted:${c.heading};--c-nav:${c.nav};--c-nav-active:${c.navActive};--c-accent:${c.accent};--c-accent-dark:${c.accentDark};--c-bg:${c.background};--c-footer:${c.footerBackground};--c-footer-text:${c.footerText};--font-body:'${d.fonts.body}', Helvetica, Arial, sans-serif;--font-script:'${d.fonts.script}', cursive;--fs-base:${d.fonts.baseSizePx}px}`;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRootData();
  const design = data?.site.settings.design;
  const favicon = design?.favicon ?? design?.logo;
  return (
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        {favicon ? <link rel="icon" href={favicon.url} /> : <link rel="icon" href="/favicon.ico" />}
        <Meta />
        <Links />
        {design && <style dangerouslySetInnerHTML={{ __html: designCss(design) }} />}
      </head>
      <body>
        <a className="skip-link" href="#inhalt">
          Zum Inhalt springen
        </a>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  const site: PublicSite = loaderData.site;
  const year = loaderData.year;
  return (
    <>
      <Header site={site} />
      <main id="inhalt" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer site={site} year={year} />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const data = useRootData();
  let title = 'Ein Fehler ist aufgetreten';
  let details = 'Bitte versuchen Sie es später erneut.';
  let stack: string | undefined;
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = 'Seite nicht gefunden';
      details = 'Die angeforderte Seite gibt es leider nicht (mehr).';
    } else if (typeof error.data === 'string' && error.data) {
      details = error.data;
    }
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }
  const body = (
    <section className="section">
      <div className="row error-page">
        <h1 className="page-title">{title}</h1>
        <p>{details}</p>
        <p>
          <Link to="/" className="btn">
            Zur Startseite
          </Link>
        </p>
        {stack && (
          <pre>
            <code>{stack}</code>
          </pre>
        )}
      </div>
    </section>
  );
  if (!data) return <main id="inhalt">{body}</main>;
  return (
    <>
      <title>{`${title} – Haus Anna Bodenmais`}</title>
      <meta name="robots" content="noindex" />
      <Header site={data.site} />
      <main id="inhalt">{body}</main>
      <Footer site={data.site} year={data.year} />
    </>
  );
}
