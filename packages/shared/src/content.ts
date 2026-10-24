import { z } from 'zod';
import { imageSchema } from './common.js';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Farbe als #RRGGBB');

/** Schriften, die selbst gehostet ausgeliefert werden (DSGVO: kein Google-Fonts-CDN). */
export const FONT_OPTIONS = {
  body: ['Open Sans', 'Lato', 'Source Sans 3', 'Roboto'],
  script: ['Montez', 'Dancing Script', 'Great Vibes', 'Open Sans'],
} as const;

export const designSettingsSchema = z.object({
  colors: z.object({
    text: hexColor,
    heading: hexColor,
    nav: hexColor,
    navActive: hexColor,
    accent: hexColor,
    accentDark: hexColor,
    background: hexColor,
    footerBackground: hexColor,
    footerText: hexColor,
  }),
  fonts: z.object({
    body: z.enum(FONT_OPTIONS.body),
    script: z.enum(FONT_OPTIONS.script),
    baseSizePx: z.number().int().min(12).max(20),
  }),
  logo: imageSchema.nullable(),
  headerImage: imageSchema.nullable(),
  favicon: imageSchema.nullable(),
});
export type DesignSettings = z.infer<typeof designSettingsSchema>;

export const DEFAULT_DESIGN: DesignSettings = {
  colors: {
    text: '#666666',
    heading: '#8e8b7d',
    nav: '#545454',
    navActive: '#755b00',
    accent: '#755b00',
    accentDark: '#513e00',
    background: '#ffffff',
    footerBackground: '#e3dcbf',
    footerText: '#666666',
  },
  fonts: { body: 'Open Sans', script: 'Montez', baseSizePx: 14 },
  logo: null,
  headerImage: null,
  favicon: null,
};

export const siteInfoSchema = z.object({
  siteTitle: z.string().min(1),
  tagline: z.string().default(''),
  contact: z.object({
    name: z.string(),
    street: z.string(),
    zip: z.string(),
    city: z.string(),
    phone: z.string(),
    email: z.string().email(),
  }),
  checkInFrom: z.string().default('15:00'),
  checkOutUntil: z.string().default('10:00'),
  copyright: z.string().default(''),
});
export type SiteInfo = z.infer<typeof siteInfoSchema>;

export const siteSettingsSchema = z.object({
  design: designSettingsSchema,
  info: siteInfoSchema,
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;

/** Inhaltsblöcke einer Seite. Erweiterbar über neue "type"-Werte. */
export const pageBlockSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string(),
    type: z.literal('hero'),
    heading: z.string(),
    html: z.string().default(''),
    image: imageSchema.nullable().default(null),
  }),
  z.object({ id: z.string(), type: z.literal('richText'), html: z.string() }),
  z.object({
    id: z.string(),
    type: z.literal('accommodationTeasers'),
    heading: z.string().default(''),
  }),
  z.object({ id: z.string(), type: z.literal('contact'), heading: z.string().default('Kontakt') }),
  z.object({ id: z.string(), type: z.literal('gallery'), images: z.array(imageSchema) }),
  z.object({
    id: z.string(),
    type: z.literal('faq'),
    heading: z.string().default(''),
    items: z.array(
      z.object({ question: z.string(), html: z.string(), open: z.boolean().default(false) }),
    ),
  }),
  z.object({
    id: z.string(),
    type: z.literal('cards'),
    heading: z.string().default(''),
    columns: z.number().int().min(1).max(4).default(3),
    items: z.array(
      z.object({
        title: z.string(),
        html: z.string().default(''),
        image: imageSchema.nullable().default(null),
        url: z.string().default(''),
      }),
    ),
  }),
  z.object({
    id: z.string(),
    type: z.literal('imageText'),
    heading: z.string().default(''),
    html: z.string().default(''),
    image: imageSchema.nullable().default(null),
    imagePosition: z.enum(['left', 'right']).default('left'),
  }),
]);
export type PageBlock = z.infer<typeof pageBlockSchema>;
export type PageBlockType = PageBlock['type'];

export const pageSchema = z.object({
  slug: z.string(),
  title: z.string().min(1),
  metaTitle: z.string().default(''),
  metaDescription: z.string().default(''),
  showInMenu: z.boolean().default(false),
  menuOrder: z.number().int().default(0),
  showInFooter: z.boolean().default(false),
  blocks: z.array(pageBlockSchema),
  updatedAt: z.string().optional(),
});
export type Page = z.infer<typeof pageSchema>;

export const mediaItemSchema = z.object({
  id: z.string(),
  url: z.string(),
  filename: z.string(),
  alt: z.string(),
  mimeType: z.string(),
  size: z.number(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  folder: z.string().default(''),
  uploadedAt: z.string(),
});
export type MediaItem = z.infer<typeof mediaItemSchema>;
