import { Link } from 'react-router';
import type { PageBlock } from '@hausanna/shared';
import { truncateWords } from '../lib/format';
import type { PublicSite } from '../lib/types';
import { ContactBlock } from './ContactBlock';
import { Faq } from './Faq';
import { Gallery } from './Gallery';

type CardsBlock = Extract<PageBlock, { type: 'cards' }>;

/** Import enthält eigene „Mehr lesen“-Links – die Karte setzt ihren eigenen. */
function withoutMoreLink(html: string): string {
  return html.replace(/<p>(?:(?!<\/p>).)*Mehr lesen(?:(?!<\/p>).)*<\/p>/gs, '').trim();
}

function Html({ html, className = '' }: { html: string; className?: string }) {
  return <div className={`content ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Abschnitt mit Standard-Breite (80 %, max. 1080px) */
function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`section ${className}`}>
      <div className="row">{children}</div>
    </section>
  );
}

function Hero({ block, site }: { block: Extract<PageBlock, { type: 'hero' }>; site: PublicSite }) {
  const image = block.image ?? site.settings.design.headerImage;
  return (
    <section
      className="hero"
      style={image ? { backgroundImage: `url("${image.url}")` } : undefined}
    >
      <div className="hero__inner">
        <h2 className="hero__title">{block.heading}</h2>
        {block.html && <Html html={block.html} className="hero__text" />}
      </div>
    </section>
  );
}

/** Teaser-Karten der Unterkünfte (aus der Datenbank, Reihenfolge = Sortierung im Admin). */
function AccommodationTeasers({ site, texts }: { site: PublicSite; texts: Map<string, string> }) {
  return (
    <section className="section section--teasers">
      <div className="teasers">
        {site.accommodations.map((a) => {
          const html = texts.get(a.name);
          return (
            <article key={a.id} className="acc-card">
              <Link
                to={`/${a.slug}/`}
                tabIndex={-1}
                aria-hidden="true"
                className="acc-card__imglink"
              >
                {a.coverImage ? (
                  <img
                    className="acc-card__img"
                    src={a.coverImage.url}
                    alt=""
                    loading="lazy"
                    width={800}
                    height={600}
                  />
                ) : (
                  <span className="acc-card__img acc-card__img--empty" />
                )}
              </Link>
              <div className="acc-card__body">
                <h3 className="acc-card__title">
                  <Link to={`/${a.slug}/`}>{a.name}</Link>
                </h3>
                {html ? (
                  <Html html={html} className="acc-card__text" />
                ) : (
                  <p className="acc-card__text">{truncateWords(a.teaser, 150)}</p>
                )}
                <Link to={`/${a.slug}/`} className="acc-card__more">
                  Mehr lesen<span className="visually-hidden"> über {a.name}</span>
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Cards({ block }: { block: CardsBlock }) {
  return (
    <Section className="section--cards">
      {block.heading && <h2 className="script-heading">{block.heading}</h2>}
      <div className={`tips tips--cols-${block.columns}`}>
        {block.items.map((item, i) => (
          <article key={i} className="tip">
            {item.image && (
              <img className="tip__img" src={item.image.url} alt={item.image.alt} loading="lazy" />
            )}
            <h4 className="tip__title">
              {item.url ? <Link to={item.url}>{item.title}</Link> : item.title}
            </h4>
            <Html html={item.html} className="tip__text" />
          </article>
        ))}
      </div>
    </Section>
  );
}

/**
 * Rendert die Inhaltsblöcke einer Seite.
 * Startseite: "cards"-Blöcke, deren Titel nur Unterkunftsnamen sind, liefern lediglich die
 * Kurztexte für die Teaser (Import-Eigenheit) und werden nicht doppelt angezeigt.
 */
export function Blocks({ blocks, site }: { blocks: PageBlock[]; site: PublicSite }) {
  const accNames = new Set(site.accommodations.map((a) => a.name));
  const hasTeasers = blocks.some((b) => b.type === 'accommodationTeasers');
  const teaserTexts = new Map<string, string>();
  const isTeaserCards = (b: PageBlock): boolean =>
    b.type === 'cards' &&
    hasTeasers &&
    b.items.length > 0 &&
    b.items.every((i) => accNames.has(i.title));
  for (const b of blocks) {
    if (b.type === 'cards' && isTeaserCards(b))
      for (const i of b.items) teaserTexts.set(i.title, withoutMoreLink(i.html));
  }

  // Text + Bild direkt hintereinander (z. B. Kontaktseite) → zweispaltig
  const out: React.ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    const nextBlock = blocks[i + 1];
    if (isTeaserCards(b)) continue;
    switch (b.type) {
      case 'hero':
        out.push(<Hero key={b.id} block={b} site={site} />);
        break;
      case 'richText':
        if (nextBlock?.type === 'imageText' && !nextBlock.html && nextBlock.image) {
          out.push(
            <Section key={b.id} className="section--split">
              <div className="cols-2">
                <Html html={b.html} />
                <img
                  className="rounded-image"
                  src={nextBlock.image.url}
                  alt={nextBlock.image.alt}
                  loading="lazy"
                  width={800}
                  height={600}
                />
              </div>
            </Section>,
          );
          i++;
        } else {
          out.push(
            <Section key={b.id}>
              <Html html={b.html} />
            </Section>,
          );
        }
        break;
      case 'imageText':
        out.push(
          <Section key={b.id}>
            <div className={`cols-2${b.imagePosition === 'right' ? ' cols-2--reverse' : ''}`}>
              {b.image && (
                <img
                  className="rounded-image"
                  src={b.image.url}
                  alt={b.image.alt}
                  loading="lazy"
                  width={800}
                  height={600}
                />
              )}
              <div>
                {b.heading && <h2 className="script-heading">{b.heading}</h2>}
                <Html html={b.html} />
              </div>
            </div>
          </Section>,
        );
        break;
      case 'accommodationTeasers':
        out.push(<AccommodationTeasers key={b.id} site={site} texts={teaserTexts} />);
        break;
      case 'contact':
        out.push(
          <Section key={b.id}>
            <ContactBlock info={site.settings.info} heading={b.heading} as="h2" />
          </Section>,
        );
        break;
      case 'gallery':
        out.push(
          <Section key={b.id} className="section--gallery">
            <Gallery images={b.images} variant="landscape" />
          </Section>,
        );
        break;
      case 'faq':
        out.push(
          <Section key={b.id} className="section--faq">
            {b.heading && <h2 className="script-heading">{b.heading}</h2>}
            <Faq items={b.items} />
          </Section>,
        );
        break;
      case 'cards':
        out.push(<Cards key={b.id} block={b} />);
        break;
    }
  }
  return <>{out}</>;
}
