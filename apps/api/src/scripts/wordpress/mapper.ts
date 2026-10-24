import type {
  AccommodationInput,
  AmenityGroup,
  BookingSource,
  BookingStatus,
  ExtraInput,
  Guest,
  Image,
  Page,
  PageBlock,
} from '@hausanna/shared';
import { phpUnserialize, type PhpValue } from './php-unserialize.js';
import { contentModules, parseShortcodes, type ShortcodeNode } from './shortcodes.js';
import type { WpItem } from './wp-export.js';

export const SITE_HOST = 'hausanna-bodenmais.de';

export interface MediaRef {
  wpId: string;
  /** relativer Pfad unter wp-content/uploads, z. B. 2025/06/garten_004.jpg */
  path: string;
  alt: string;
}

export interface ImportPlan {
  media: MediaRef[];
  accommodations: { legacyId: string; input: AccommodationInput }[];
  seasons: { legacyId: string; name: string; startDate: string; endDate: string }[];
  /** legacy accommodation id → legacy season id → Preis */
  seasonPrices: {
    accommodationLegacyId: string;
    seasonLegacyId: string;
    pricePerNight: number;
    baseGuests: number;
    extraGuestPricePerNight: number;
  }[];
  extras: { legacyId: string; input: ExtraInput }[];
  bookings: {
    legacyId: string;
    accommodationLegacyId: string;
    arrival: string;
    departure: string;
    adults: number;
    children: number;
    status: BookingStatus;
    source: BookingSource;
    externalRef: string;
    guest: Partial<Guest> | null;
    note: string;
    totalPrice: number | null;
  }[];
  pages: Page[];
  logoPath: string | null;
  headerImagePath: string | null;
  warnings: string[];
}

/** Bild-URL der alten Seite → unser Medienpfad (/media/wp/…), Größen-Varianten → Original */
export function mediaUrl(url: string, known: Set<string>): string {
  const m = /wp-content\/uploads\/(.+?)(?:\?.*)?$/.exec(url);
  if (!m) return url;
  let path = m[1]!;
  if (!known.has(path)) {
    const original = path.replace(/-\d+x\d+(\.\w+)$/, '$1').replace(/-scaled(\.\w+)$/, '$1');
    if (known.has(original)) path = original;
  }
  return `/media/wp/${path}`;
}

/** Inhalts-HTML aufräumen: Links/Bilder umschreiben, WordPress-Absätze erzeugen */
export function cleanHtml(html: string, known: Set<string>): string {
  let out = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/https?:\/\/(?:www\.)?hausanna-bodenmais\.de\/wp-content\/uploads\/[^"'\s)]+/g, (u) =>
      mediaUrl(u, known),
    )
    .replace(
      /https?:\/\/(?:www\.)?hausanna-bodenmais\.de(\/[^"'\s]*)?/g,
      (_m, p: string | undefined) => p ?? '/',
    )
    .replace(/\[\/?[a-z_]+[^\]]*\]/g, '') // übrige Shortcodes
    .trim();
  if (out && !/<(p|h[1-6]|ul|ol|div|table)\b/i.test(out)) {
    out = out
      .split(/\n\s*\n/)
      .map((p) => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
      .join('');
  } else {
    out = out.replace(/\n\s*\n/g, '').replace(/\n/g, ' ');
  }
  return out;
}

const stripTags = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const decode = (s: string) =>
  s
    .replace(/%22/g, '"')
    .replace(/%91/g, '[')
    .replace(/%93/g, ']')
    .replace(/&#8211;/g, '–')
    .replace(/&amp;/g, '&');

/** "<p><strong>Küche & Geräte:</strong> A, B, C</p>" → Ausstattungsgruppen */
export function parseAmenities(html: string): AmenityGroup[] {
  const groups: AmenityGroup[] = [];
  const merged = html
    .replace(/<\/strong>\s*<strong>/g, '')
    .replace(/<b>/g, '<strong>')
    .replace(/<\/b>/g, '</strong>');
  for (const m of merged.matchAll(
    /<strong>\s*([^<:]{2,60}?)\s*:?\s*<\/strong>\s*:?\s*(?:<br\s*\/?>\s*)*([^<]+)/g,
  )) {
    const title = decode(m[1]!).replace(/:$/, '').trim();
    const items = decode(m[2]!)
      .split(/,|·|•/)
      .map((s) => s.trim().replace(/\.$/, ''))
      .filter((s) => s.length > 1);
    if (items.length) groups.push({ title, items });
  }
  return groups;
}

function num(v: PhpValue | undefined): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v);
  return 0;
}

let blockSeq = 0;
const bid = (prefix: string) => `${prefix}-${++blockSeq}`;

export function buildPlan(
  items: WpItem[],
  options: { knownUploads: Set<string>; today?: string },
): ImportPlan {
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  blockSeq = 0;
  const warnings: string[] = [];
  const known = options.knownUploads;
  const byType = (t: string) => items.filter((i) => i.type === t && i.status !== 'trash');

  // --- Medien ---
  const media: MediaRef[] = byType('attachment').map((a) => ({
    wpId: a.id,
    path: (/wp-content\/uploads\/(.+)$/.exec(a.attachmentUrl)?.[1] ?? '').trim(),
    alt: a.meta._wp_attachment_image_alt || a.title,
  }));
  const mediaById = new Map(media.map((m) => [m.wpId, m]));
  const image = (wpId: string | undefined): Image | null => {
    const m = wpId ? mediaById.get(wpId.trim()) : undefined;
    return m?.path ? { url: `/media/wp/${m.path}`, alt: m.alt } : null;
  };
  const images = (ids: string | undefined): Image[] =>
    (ids ?? '')
      .split(',')
      .map((id) => image(id))
      .filter((i): i is Image => i !== null);

  // --- Menü: Reihenfolge + Untertitel der Unterkünfte ---
  const navItems = byType('nav_menu_item');
  const navFor = (pageId: string) => navItems.find((n) => n.meta._menu_item_object_id === pageId);

  // --- Unterkünfte ---
  const pages = byType('page').filter((p) => p.status === 'publish');
  const accommodations: ImportPlan['accommodations'] = [];
  const accPageIds = new Set<string>();
  for (const rt of byType('mphb_room_type').filter((r) => r.status === 'publish')) {
    const page = pages.find((p) => p.title.startsWith(`${rt.title} `) || p.title === rt.title);
    if (!page) warnings.push(`Keine Seite zu Unterkunft "${rt.title}" gefunden`);
    if (page) accPageIds.add(page.id);
    const tree = page ? parseShortcodes(page.content) : [];
    const mods = contentModules(tree);
    const textMod = mods.find((m) => m.tag === 'et_pb_text');
    const priceBlurb = mods.find((m) => m.tag === 'et_pb_blurb');
    const gallery = mods.find((m) => m.tag === 'et_pb_gallery');
    const nav = page ? navFor(page.id) : undefined;
    const menuLabel = nav?.title.includes(':')
      ? nav.title.split(':').slice(1).join(':').trim()
      : '';
    const adults = num(rt.meta.mphb_adults_capacity);
    const children = num(rt.meta.mphb_children_capacity);
    const galleryImages = images(
      gallery?.attrs.gallery_ids || rt.meta.mphb_gallery || rt.meta.mphb_gh_images,
    );
    const amenityGroups = textMod ? parseAmenities(textMod.content) : [];
    if (!amenityGroups.length) warnings.push(`${rt.title}: keine Ausstattungsliste erkannt`);

    accommodations.push({
      legacyId: rt.id,
      input: {
        slug: page?.slug ?? rt.slug,
        name: rt.title,
        menuLabel,
        sizeSqm: num(rt.meta.mphb_size) || 1,
        maxGuests: Math.max(1, adults + children),
        beds: rt.meta.mphb_bed ?? '',
        teaser: stripTags(rt.excerpt || rt.content).slice(0, 400),
        descriptionHtml: cleanHtml(rt.content, known),
        amenityGroups,
        coverImage: image(rt.meta._thumbnail_id) ?? galleryImages[0] ?? null,
        images: galleryImages,
        status: 'published',
        sortOrder: nav?.menuOrder ?? 99,
        basePricePerNight: 0,
        baseGuests: Math.max(1, num(rt.meta.mphb_base_adults_capacity) || adults),
        extraGuestPricePerNight: 0,
        minNights: 3,
        petsAllowed: /hund|haustier/i.test(`${rt.content} ${textMod?.content ?? ''}`),
        priceNote: priceBlurb ? cleanHtml(priceBlurb.content, known) : '',
      },
    });
  }
  const accByLegacy = new Map(accommodations.map((a) => [a.legacyId, a]));

  // --- Saisons & Preise ---
  const seasonsRaw = byType('mphb_season').filter((s) => s.status === 'publish');
  const seasons = seasonsRaw
    .map((s) => ({
      legacyId: s.id,
      name: s.title,
      startDate: s.meta.mphb_start_date ?? '',
      endDate: s.meta.mphb_end_date ?? '',
    }))
    .filter((s) => s.startDate && s.endDate);
  const seasonPrices: ImportPlan['seasonPrices'] = [];
  for (const rate of byType('mphb_rate').filter((r) => r.status === 'publish')) {
    const acc = accByLegacy.get(rate.meta.mphb_room_type_id ?? '');
    if (!acc || !rate.meta.mphb_season_prices) continue;
    let list: PhpValue;
    try {
      list = phpUnserialize(rate.meta.mphb_season_prices);
    } catch (e) {
      warnings.push(`Preise "${rate.title}" nicht lesbar: ${String(e)}`);
      continue;
    }
    const entries = (Array.isArray(list) ? list : Object.values(list as object)) as Record<
      string,
      PhpValue
    >[];
    // Grundpreis = Preis der heute gültigen Saison (sonst erste Saison mit Preis)
    const seasonOf = (e: Record<string, PhpValue>) =>
      seasons.find((s) => s.legacyId === String(e.season ?? ''));
    entries.sort((a, b) => {
      const cur = (e: Record<string, PhpValue>) => {
        const s = seasonOf(e);
        return s && s.startDate <= today && today <= s.endDate ? 0 : 1;
      };
      return cur(a) - cur(b);
    });
    let baseSet = false;
    for (const e of entries) {
      const price = (e.price ?? {}) as Record<string, PhpValue>;
      const perNight = num((price.prices as PhpValue[] | undefined)?.[0]);
      if (!perNight) continue;
      const baseGuests = Math.max(1, num(price.base_adults) || acc.input.baseGuests);
      const extra = num((price.extra_adult_prices as PhpValue[] | undefined)?.[0]);
      const seasonLegacyId = String(e.season ?? '');
      if (!baseSet) {
        acc.input.basePricePerNight = perNight;
        acc.input.baseGuests = Math.min(baseGuests, acc.input.maxGuests);
        acc.input.extraGuestPricePerNight = extra;
        baseSet = true;
      }
      if (seasons.some((s) => s.legacyId === seasonLegacyId)) {
        seasonPrices.push({
          accommodationLegacyId: acc.legacyId,
          seasonLegacyId,
          pricePerNight: perNight,
          baseGuests: Math.min(baseGuests, acc.input.maxGuests),
          extraGuestPricePerNight: extra,
        });
      }
    }
    if (!baseSet) warnings.push(`${acc.input.name}: kein Preis gefunden – bitte im Admin setzen`);
  }

  // --- Zusatzleistungen ---
  const extras = byType('mphb_room_service')
    .filter((s) => s.status === 'publish')
    .map((s) => ({
      legacyId: s.id,
      input: {
        name: s.title,
        description: stripTags(s.content),
        price: num(s.meta.mphb_price),
        chargeType:
          s.meta.mphb_price_periodicity === 'per_night'
            ? ('per_night' as const)
            : ('per_stay' as const),
        active: true,
      },
    }));

  // --- Buchungen ---
  const roomToType = new Map(
    byType('mphb_room').map((r) => [r.id, r.meta.mphb_room_type_id ?? '']),
  );
  const reserved = byType('mphb_reserved_room');
  const bookings: ImportPlan['bookings'] = [];
  for (const b of items.filter((i) => i.type === 'mphb_booking')) {
    const rr = reserved.filter((r) => r.parent === b.id);
    const arrival = b.meta.mphb_check_in_date;
    const departure = b.meta.mphb_check_out_date;
    if (!arrival || !departure || rr.length === 0) {
      warnings.push(`Buchung ${b.id} unvollständig, übersprungen`);
      continue;
    }
    const fromBookingCom = (b.meta.mphb_ical_prodid ?? '').includes('booking.com');
    const status: BookingStatus = [
      'confirmed',
      'pending',
      'pending-user',
      'pending-payment',
    ].includes(b.status)
      ? b.status === 'confirmed'
        ? 'confirmed'
        : 'pending'
      : 'cancelled';
    for (const r of rr) {
      const typeId = roomToType.get(r.meta._mphb_room_id ?? '') ?? '';
      if (!accByLegacy.has(typeId)) {
        warnings.push(`Buchung ${b.id}: Unterkunft unbekannt`);
        continue;
      }
      const uid = r.meta._mphb_uid ?? '';
      const guestName = [b.meta.mphb_first_name, b.meta.mphb_last_name].filter(Boolean);
      bookings.push({
        legacyId: `${b.id}-${r.id}`,
        accommodationLegacyId: typeId,
        arrival,
        departure,
        adults: num(r.meta._mphb_adults),
        children: num(r.meta._mphb_children),
        status,
        source: fromBookingCom ? 'booking_com' : 'wordpress',
        externalRef: fromBookingCom && uid ? uid : `wp-${b.id}-${r.id}`,
        guest:
          guestName.length || b.meta.mphb_email
            ? {
                firstName: b.meta.mphb_first_name ?? '',
                lastName: b.meta.mphb_last_name ?? '',
                email: b.meta.mphb_email ?? '',
                phone: b.meta.mphb_phone ?? '',
                street: b.meta.mphb_address1 ?? '',
                zip: b.meta.mphb_zip ?? '',
                city: b.meta.mphb_city ?? '',
                country: (b.meta.mphb_country ?? '').slice(0, 2),
              }
            : null,
        note: [b.meta.mphb_note, b.meta.mphb_ical_summary].filter(Boolean).join('\n'),
        totalPrice: b.meta.mphb_total_price ? Number(b.meta.mphb_total_price) || null : null,
      });
    }
  }

  // --- Seiten ---
  const skip = new Set([
    'verfuegbarkeitsuche',
    'stornierung-der-buchung',
    'buchungsbestaetigung',
    'buchung-bestaetigt',
    'buchung-storniert',
    'reservierung-erhalten',
    'transaktion-fehlgeschlagen',
    'mein-konto',
  ]);
  const outPages: Page[] = [];
  for (const p of pages) {
    if (accPageIds.has(p.id) || skip.has(p.slug)) continue;
    const nav = navFor(p.id);
    const isHome = p.slug === 'startseite';
    outPages.push({
      slug: isHome ? 'home' : p.slug,
      title: isHome ? 'Startseite' : p.title,
      metaTitle: '',
      metaDescription: stripTags(p.excerpt).slice(0, 160),
      showInMenu: !isHome && Boolean(nav) && !['impressum', 'datenschutz', 'agb'].includes(p.slug),
      menuOrder: nav?.menuOrder ?? 50,
      showInFooter: ['impressum', 'datenschutz', 'agb'].includes(p.slug),
      blocks: pageBlocks(parseShortcodes(p.content), { known, image, images, isHome }),
    });
  }

  const logo =
    media.find(
      (m) => /\/haus-anna-bodenmais\.(png|svg|jpe?g)$/i.test(m.path) && known.has(m.path),
    ) ??
    media.find(
      (m) => /haus-anna-bodenmais(-\d+)?\.(png|svg|jpe?g)$/i.test(m.path) && known.has(m.path),
    );
  const header = media.find((m) => /home_header\./i.test(m.path));
  return {
    media,
    accommodations,
    seasons,
    seasonPrices,
    extras,
    bookings,
    pages: outPages,
    logoPath: logo?.path ?? null,
    headerImagePath: header?.path ?? null,
    warnings,
  };
}

function pageBlocks(
  tree: ShortcodeNode[],
  ctx: {
    known: Set<string>;
    image: (id: string | undefined) => Image | null;
    images: (ids: string | undefined) => Image[];
    isHome: boolean;
  },
): PageBlock[] {
  const blocks: PageBlock[] = [];
  const imgFromUrl = (url: string | undefined, alt = ''): Image | null =>
    url ? { url: mediaUrl(url, ctx.known), alt } : null;
  let teasersAdded = false;
  let pendingCards: { title: string; html: string; image: Image | null; url: string }[] = [];
  const flushCards = () => {
    if (pendingCards.length) {
      blocks.push({
        id: bid('cards'),
        type: 'cards',
        heading: '',
        columns: 3,
        items: pendingCards,
      });
      pendingCards = [];
    }
  };

  for (const m of contentModules(tree)) {
    if (m.tag !== 'et_pb_blurb') flushCards();
    switch (m.tag) {
      case 'et_pb_fullwidth_slider':
      case 'et_pb_slider': {
        const slide = m.children.find((c) => c.tag === 'et_pb_slide');
        blocks.push({
          id: bid('hero'),
          type: 'hero',
          heading: decode(slide?.attrs.heading ?? ''),
          html: cleanHtml(slide?.content ?? '', ctx.known),
          image: imgFromUrl(slide?.attrs.background_image || m.attrs.background_image),
        });
        break;
      }
      case 'et_pb_text':
      case 'et_pb_code': {
        const html = cleanHtml(m.content, ctx.known);
        if (stripTags(html)) blocks.push({ id: bid('text'), type: 'richText', html });
        break;
      }
      case 'et_pb_accordion':
      case 'et_pb_toggle': {
        const itemsSrc =
          m.tag === 'et_pb_toggle'
            ? [m]
            : m.children.filter((c) => c.tag === 'et_pb_accordion_item');
        blocks.push({
          id: bid('faq'),
          type: 'faq',
          heading: '',
          items: itemsSrc.map((i) => ({
            question: decode(i.attrs.title ?? '').trim(),
            html: cleanHtml(i.content, ctx.known),
            open: i.attrs.open === 'on',
          })),
        });
        break;
      }
      case 'et_pb_gallery':
        blocks.push({
          id: bid('gallery'),
          type: 'gallery',
          images: ctx.images(m.attrs.gallery_ids),
        });
        break;
      case 'et_pb_image': {
        const img = imgFromUrl(m.attrs.src, decode(m.attrs.alt ?? ''));
        if (img)
          blocks.push({
            id: bid('image'),
            type: 'imageText',
            heading: '',
            html: '',
            image: img,
            imagePosition: 'left',
          });
        break;
      }
      case 'et_pb_blurb': {
        const url = m.attrs.url ? cleanHtml(m.attrs.url, ctx.known).replace(/<\/?p>/g, '') : '';
        if (
          ctx.isHome &&
          (m.attrs.url !== undefined || m.attrs._dynamic_attributes?.includes('url'))
        ) {
          // Startseite: Unterkunfts-Teaser kommen dynamisch aus der Datenbank
          if (!teasersAdded)
            blocks.push({ id: bid('teasers'), type: 'accommodationTeasers', heading: '' });
          teasersAdded = true;
          break;
        }
        pendingCards.push({
          title: decode(m.attrs.title ?? ''),
          html: cleanHtml(m.content, ctx.known),
          image: imgFromUrl(m.attrs.image, decode(m.attrs.alt ?? m.attrs.title ?? '')),
          url,
        });
        break;
      }
      case 'et_pb_contact_form':
      case 'et_pb_map':
        blocks.push({ id: bid('contact'), type: 'contact', heading: 'Kontakt' });
        break;
      default:
        break;
    }
  }
  flushCards();
  return blocks;
}
