import type { SiteInfo } from '@hausanna/shared';

const tel = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/** Kontaktdaten aus den Einstellungen. variant="footer" (H3, dunkel) oder "page" (mit Präfixen). */
export function ContactBlock({
  info,
  heading = 'Kontakt',
  variant = 'page',
  as: Heading = 'h3',
}: {
  info: SiteInfo;
  heading?: string;
  variant?: 'page' | 'footer';
  as?: 'h1' | 'h2' | 'h3';
}) {
  const c = info.contact;
  return (
    <div className={`contact contact--${variant}`}>
      {heading && <Heading className="script-heading contact__heading">{heading}</Heading>}
      <address className="contact__lines">
        {c.street}
        <br />
        {c.zip} {c.city}
        <br />
        {variant === 'page' && 'Tel.: '}
        <a href={tel(c.phone)}>{c.phone}</a>
        <br />
        {variant === 'page' && 'E-Mail: '}
        <a href={`mailto:${c.email}`}>{c.email}</a>
      </address>
    </div>
  );
}
