import { Inject, Injectable } from '@nestjs/common';
import type { Db } from 'mongodb';
import { DEFAULT_DESIGN, type SiteSettings, siteSettingsSchema } from '@hausanna/shared';
import { MONGO_DB } from '../../../infrastructure/database/tokens.js';

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  design: DEFAULT_DESIGN,
  info: {
    siteTitle: 'Ferienhaus Ferienwohnungen Anna - Bodenmais',
    tagline: '',
    contact: {
      name: 'Haus Anna Bodenmais',
      street: 'Pfarrer-Schedlbauer-Straße 24',
      zip: '94249',
      city: 'Bodenmais',
      phone: '+49 151 11227431',
      email: 'info@hausanna-bodenmais.de',
    },
    checkInFrom: '15:00',
    checkOutUntil: '10:00',
    copyright: 'Haus Anna Bodenmais',
  },
};

interface SettingsDoc extends SiteSettings {
  _id: string;
  updatedAt: Date;
}

/** Design & Stammdaten der Seite (MongoDB, ein Dokument). Kurzer Cache für SSR. */
@Injectable()
export class SiteSettingsService {
  private cache: { value: SiteSettings; at: number } | null = null;

  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  private get col() {
    return this.db.collection<SettingsDoc>('settings');
  }

  async get(): Promise<SiteSettings> {
    if (this.cache && Date.now() - this.cache.at < 10_000) return this.cache.value;
    let value = DEFAULT_SITE_SETTINGS;
    try {
      const doc = await this.col.findOne({ _id: 'site' });
      if (doc) {
        const parsed = siteSettingsSchema.safeParse({ design: doc.design, info: doc.info });
        if (parsed.success) value = parsed.data;
      }
    } catch {
      // MongoDB weg → Standardwerte, Seite bleibt erreichbar
    }
    this.cache = { value, at: Date.now() };
    return value;
  }

  async save(settings: SiteSettings): Promise<SiteSettings> {
    await this.col.updateOne(
      { _id: 'site' },
      { $set: { ...settings, updatedAt: new Date() } },
      { upsert: true },
    );
    this.cache = null;
    return this.get();
  }
}
