import { Link } from 'react-router';
import type { PublicSite } from '../lib/types';
import { ContactBlock } from './ContactBlock';
import { WaveDivider } from './WaveDivider';

export function Footer({ site, year }: { site: PublicSite; year: number }) {
  const order = ['impressum', 'datenschutz', 'agb'];
  const pages = [...site.footerPages].sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
  return (
    <footer className="site-footer">
      <WaveDivider />
      <div className="row site-footer__cols">
        <ContactBlock info={site.settings.info} variant="footer" />
        <nav className="site-footer__links" aria-label="Rechtliches">
          {pages.map((p) => (
            <p key={p.slug}>
              <Link to={`/${p.slug}/`}>{p.title}</Link>
            </p>
          ))}
        </nav>
      </div>
      <p className="site-footer__copy">
        {site.settings.info.copyright || site.settings.info.siteTitle}, {year}
      </p>
    </footer>
  );
}
