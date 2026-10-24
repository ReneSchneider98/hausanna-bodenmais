/// <reference types="multer" />
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';
import {
  type MediaItem,
  type Page,
  pageSchema,
  type SiteSettings,
  siteSettingsSchema,
} from '@hausanna/shared';
import { DomainError } from '../../../common/domain-error.js';
import { ZodPipe } from '../../../common/zod.pipe.js';
import { MAX_UPLOAD_BYTES, MediaService } from '../application/media.service.js';
import { PagesService } from '../application/pages.service.js';
import { SiteSettingsService } from '../application/site-settings.service.js';

@Controller('admin')
export class AdminContentController {
  constructor(
    private readonly settings: SiteSettingsService,
    private readonly pages: PagesService,
    private readonly media: MediaService,
  ) {}

  @Get('settings')
  getSettings(): Promise<SiteSettings> {
    return this.settings.get();
  }

  @Put('settings')
  saveSettings(@Body(new ZodPipe(siteSettingsSchema)) body: SiteSettings): Promise<SiteSettings> {
    return this.settings.save(body);
  }

  @Get('pages')
  listPages(): Promise<Page[]> {
    return this.pages.list();
  }

  @Get('pages/:slug')
  getPage(@Param('slug') slug: string): Promise<Page> {
    return this.pages.get(slug);
  }

  @Put('pages/:slug')
  savePage(@Param('slug') slug: string, @Body(new ZodPipe(pageSchema)) body: Page): Promise<Page> {
    if (body.slug !== slug) throw new DomainError('validation', 'Slug passt nicht zur URL');
    return this.pages.save(body);
  }

  @Delete('pages/:slug')
  @HttpCode(204)
  deletePage(@Param('slug') slug: string): Promise<void> {
    return this.pages.delete(slug);
  }

  @Get('media')
  listMedia(): Promise<MediaItem[]> {
    return this.media.list();
  }

  @Post('media')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('alt') alt?: string,
  ): Promise<MediaItem> {
    if (!file) throw new DomainError('validation', 'Keine Datei');
    return this.media.upload(file, alt ?? '');
  }

  @Patch('media/:id')
  updateMedia(
    @Param('id') id: string,
    @Body(new ZodPipe(z.object({ alt: z.string() }))) body: { alt: string },
  ): Promise<MediaItem> {
    return this.media.updateAlt(id, body.alt);
  }

  @Delete('media/:id')
  @HttpCode(204)
  deleteMedia(@Param('id') id: string): Promise<void> {
    return this.media.delete(id);
  }
}
