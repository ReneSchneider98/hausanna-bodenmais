import { Controller, Get, Param } from '@nestjs/common';
import type { AccommodationSummary, Page, SiteSettings } from '@hausanna/shared';
import { Public } from '../../../common/auth.decorators.js';
import {
  AccommodationsService,
  toSummary,
} from '../../accommodations/application/accommodations.service.js';
import { PagesService } from '../application/pages.service.js';
import { SiteSettingsService } from '../application/site-settings.service.js';

export interface PublicSite {
  settings: SiteSettings;
  accommodations: AccommodationSummary[];
  menuPages: { slug: string; title: string }[];
  footerPages: { slug: string; title: string }[];
}

@Public()
@Controller('public')
export class PublicContentController {
  constructor(
    private readonly settings: SiteSettingsService,
    private readonly pages: PagesService,
    private readonly accommodations: AccommodationsService,
  ) {}

  /** Alles, was jede Seite braucht (Design, Menü, Footer) – ein Request pro Seitenaufruf. */
  @Get('site')
  async site(): Promise<PublicSite> {
    const [settings, pages, accs] = await Promise.all([
      this.settings.get(),
      this.pages.list().catch(() => [] as Page[]),
      this.accommodations.listPublished(),
    ]);
    return {
      settings,
      accommodations: accs.map(toSummary),
      menuPages: pages.filter((p) => p.showInMenu).map((p) => ({ slug: p.slug, title: p.title })),
      footerPages: pages
        .filter((p) => p.showInFooter)
        .map((p) => ({ slug: p.slug, title: p.title })),
    };
  }

  @Get('pages/:slug')
  page(@Param('slug') slug: string): Promise<Page> {
    return this.pages.get(slug);
  }
}
