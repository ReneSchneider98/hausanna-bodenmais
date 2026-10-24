import { Module } from '@nestjs/common';
import { AccommodationsModule } from '../accommodations/accommodations.module.js';
import { MediaService } from './application/media.service.js';
import { PagesService } from './application/pages.service.js';
import { SiteSettingsService } from './application/site-settings.service.js';
import { AdminContentController } from './presentation/admin-content.controller.js';
import { PublicContentController } from './presentation/public-content.controller.js';

@Module({
  imports: [AccommodationsModule],
  controllers: [PublicContentController, AdminContentController],
  providers: [SiteSettingsService, PagesService, MediaService],
  exports: [SiteSettingsService, PagesService, MediaService],
})
export class ContentModule {}
