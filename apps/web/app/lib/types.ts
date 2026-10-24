import type { Accommodation, AccommodationSummary, Extra, SiteSettings } from '@hausanna/shared';

export interface PublicSite {
  settings: SiteSettings;
  accommodations: AccommodationSummary[];
  menuPages: { slug: string; title: string }[];
  footerPages: { slug: string; title: string }[];
}

export interface AccommodationDetail {
  accommodation: Accommodation;
  extras: Extra[];
}
