import { Injectable } from '@nestjs/common';
import type {
  Accommodation,
  AccommodationInput,
  AccommodationSummary,
  Extra,
  ExtraInput,
  Season,
  SeasonInput,
  SeasonPrice,
} from '@hausanna/shared';
import { DomainError, notFound } from '../../../common/domain-error.js';
import { pgErrorCode, PG_ERROR } from '../../../infrastructure/database/drizzle.js';
import { sanitizeRichText } from '../../content/domain/sanitize.js';
import { AccommodationsRepository } from '../infrastructure/accommodations.repository.js';

/** HTML-Felder säubern (Schutz vor Skripten in Beschreibungen) */
function clean<T extends Partial<AccommodationInput>>(input: T): T {
  return {
    ...input,
    ...(input.descriptionHtml !== undefined
      ? { descriptionHtml: sanitizeRichText(input.descriptionHtml) }
      : {}),
    ...(input.priceNote !== undefined ? { priceNote: sanitizeRichText(input.priceNote) } : {}),
  };
}

export function toSummary(a: Accommodation): AccommodationSummary {
  return {
    id: a.id,
    slug: a.slug,
    name: a.name,
    menuLabel: a.menuLabel,
    sizeSqm: a.sizeSqm,
    maxGuests: a.maxGuests,
    teaser: a.teaser,
    coverImage: a.coverImage,
    sortOrder: a.sortOrder,
    basePricePerNight: a.basePricePerNight,
    baseGuests: a.baseGuests,
  };
}

@Injectable()
export class AccommodationsService {
  constructor(private readonly repo: AccommodationsRepository) {}

  listPublished(): Promise<Accommodation[]> {
    return this.repo.list({ publishedOnly: true });
  }

  listAll(includeArchived: boolean): Promise<Accommodation[]> {
    return this.repo.list({ includeArchived });
  }

  async getPublishedBySlug(slug: string): Promise<Accommodation> {
    const a = await this.repo.findBySlug(slug);
    if (!a || a.status !== 'published') throw notFound('Unterkunft');
    return a;
  }

  async get(id: string): Promise<Accommodation> {
    const a = await this.repo.findById(id);
    if (!a) throw notFound('Unterkunft');
    return a;
  }

  async create(input: AccommodationInput): Promise<Accommodation> {
    try {
      return await this.repo.insert(clean(input));
    } catch (e) {
      if (pgErrorCode(e) === PG_ERROR.uniqueViolation) {
        throw new DomainError('conflict', `Die Adresse "${input.slug}" ist schon vergeben`);
      }
      throw e;
    }
  }

  async update(id: string, input: Partial<AccommodationInput>): Promise<Accommodation> {
    try {
      const a = await this.repo.update(id, clean(input));
      if (!a) throw notFound('Unterkunft');
      return a;
    } catch (e) {
      if (pgErrorCode(e) === PG_ERROR.uniqueViolation) {
        throw new DomainError('conflict', `Die Adresse "${input.slug}" ist schon vergeben`);
      }
      throw e;
    }
  }

  listSeasons(): Promise<Season[]> {
    return this.repo.listSeasons();
  }
  createSeason(input: SeasonInput): Promise<Season> {
    return this.repo.insertSeason(input);
  }
  async updateSeason(id: string, input: SeasonInput): Promise<Season> {
    const s = await this.repo.updateSeason(id, input);
    if (!s) throw notFound('Saison');
    return s;
  }
  deleteSeason(id: string): Promise<void> {
    return this.repo.deleteSeason(id);
  }

  async getSeasonPrices(accommodationId: string): Promise<SeasonPrice[]> {
    await this.get(accommodationId);
    return this.repo.listSeasonPrices(accommodationId);
  }
  async setSeasonPrices(accommodationId: string, prices: SeasonPrice[]): Promise<SeasonPrice[]> {
    await this.get(accommodationId);
    const seasonIds = new Set((await this.repo.listSeasons()).map((s) => s.id));
    if (prices.some((p) => !seasonIds.has(p.seasonId))) throw notFound('Saison');
    await this.repo.replaceSeasonPrices(accommodationId, prices);
    return this.repo.listSeasonPrices(accommodationId);
  }

  listExtras(activeOnly: boolean): Promise<Extra[]> {
    return this.repo.listExtras(activeOnly);
  }
  createExtra(input: ExtraInput): Promise<Extra> {
    return this.repo.insertExtra(input);
  }
  async updateExtra(id: string, input: ExtraInput): Promise<Extra> {
    const e = await this.repo.updateExtra(id, input);
    if (!e) throw notFound('Zusatzleistung');
    return e;
  }
}
