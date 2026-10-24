import { Inject, Injectable } from '@nestjs/common';
import type { Db } from 'mongodb';
import { type Page, type PageBlock, pageSchema } from '@hausanna/shared';
import { notFound } from '../../../common/domain-error.js';
import { MONGO_DB } from '../../../infrastructure/database/tokens.js';
import { sanitizeRichText } from '../domain/sanitize.js';

type PageDoc = Page & { _id: string; updatedAt: string };

function sanitizeBlock(b: PageBlock): PageBlock {
  switch (b.type) {
    case 'hero':
    case 'imageText':
      return { ...b, html: sanitizeRichText(b.html) };
    case 'richText':
      return { ...b, html: sanitizeRichText(b.html) };
    case 'faq':
      return { ...b, items: b.items.map((i) => ({ ...i, html: sanitizeRichText(i.html) })) };
    case 'cards':
      return { ...b, items: b.items.map((i) => ({ ...i, html: sanitizeRichText(i.html) })) };
    default:
      return b;
  }
}

/** Seiteninhalte (Startseite, FAQ, Ausflugstipps, Kontakt, Impressum …) in MongoDB. */
@Injectable()
export class PagesService {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get col() {
    return this.db.collection<PageDoc>('pages');
  }

  async list(): Promise<Page[]> {
    const docs = await this.col.find().sort({ menuOrder: 1, title: 1 }).toArray();
    return docs.map(({ _id, ...p }) => pageSchema.parse(p));
  }

  async get(slug: string): Promise<Page> {
    const doc = await this.col.findOne({ _id: slug });
    if (!doc) throw notFound('Seite');
    const { _id, ...p } = doc;
    return pageSchema.parse(p);
  }

  async save(page: Page): Promise<Page> {
    const clean: Page = { ...page, blocks: page.blocks.map(sanitizeBlock) };
    await this.col.replaceOne(
      { _id: page.slug },
      { ...clean, updatedAt: new Date().toISOString() },
      { upsert: true },
    );
    return this.get(page.slug);
  }

  async delete(slug: string): Promise<void> {
    await this.col.deleteOne({ _id: slug });
  }
}
