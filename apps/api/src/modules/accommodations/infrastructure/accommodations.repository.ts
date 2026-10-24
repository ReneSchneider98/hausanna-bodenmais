import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import type {
  Accommodation,
  AccommodationInput,
  Extra,
  ExtraInput,
  Season,
  SeasonInput,
  SeasonPrice,
} from '@hausanna/shared';
import type { Database } from '../../../infrastructure/database/drizzle.js';
import {
  accommodations,
  extras,
  seasonPrices,
  seasons,
} from '../../../infrastructure/database/schema.js';
import { DB } from '../../../infrastructure/database/tokens.js';

type AccRow = typeof accommodations.$inferSelect;

export function toAccommodation(r: AccRow): Accommodation {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    menuLabel: r.menuLabel,
    sizeSqm: r.sizeSqm,
    maxGuests: r.maxGuests,
    beds: r.beds,
    teaser: r.teaser,
    descriptionHtml: r.descriptionHtml,
    amenityGroups: r.amenityGroups,
    coverImage: r.coverImage ?? null,
    images: r.images,
    status: r.status,
    sortOrder: r.sortOrder,
    basePricePerNight: r.basePricePerNight,
    baseGuests: r.baseGuests,
    extraGuestPricePerNight: r.extraGuestPricePerNight,
    minNights: r.minNights,
    petsAllowed: r.petsAllowed,
    priceNote: r.priceNote,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/** Port: Lesezugriff, den Buchung & Preisberechnung brauchen (für Tests austauschbar). */
export interface AccommodationCatalog {
  findById(id: string): Promise<Accommodation | undefined>;
  listSeasons(): Promise<Season[]>;
  listSeasonPrices(accommodationId: string): Promise<SeasonPrice[]>;
  listExtras(activeOnly: boolean): Promise<Extra[]>;
}
export const ACCOMMODATION_CATALOG = Symbol('ACCOMMODATION_CATALOG');

@Injectable()
export class AccommodationsRepository implements AccommodationCatalog {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(
    opts: { includeArchived?: boolean; publishedOnly?: boolean } = {},
  ): Promise<Accommodation[]> {
    const where = opts.publishedOnly
      ? eq(accommodations.status, 'published')
      : opts.includeArchived
        ? undefined
        : ne(accommodations.status, 'archived');
    const rows = await this.db
      .select()
      .from(accommodations)
      .where(where)
      .orderBy(asc(accommodations.sortOrder), asc(accommodations.name));
    return rows.map(toAccommodation);
  }

  async findById(id: string): Promise<Accommodation | undefined> {
    const [r] = await this.db.select().from(accommodations).where(eq(accommodations.id, id));
    return r && toAccommodation(r);
  }

  async findBySlug(slug: string): Promise<Accommodation | undefined> {
    const [r] = await this.db.select().from(accommodations).where(eq(accommodations.slug, slug));
    return r && toAccommodation(r);
  }

  async findByIds(ids: string[]): Promise<Accommodation[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.select().from(accommodations).where(inArray(accommodations.id, ids));
    return rows.map(toAccommodation);
  }

  async insert(input: AccommodationInput, legacyId?: string): Promise<Accommodation> {
    const [r] = await this.db
      .insert(accommodations)
      .values({ ...input, legacyId: legacyId ?? null })
      .returning();
    return toAccommodation(r!);
  }

  async update(id: string, input: Partial<AccommodationInput>): Promise<Accommodation | undefined> {
    const [r] = await this.db
      .update(accommodations)
      .set(input)
      .where(eq(accommodations.id, id))
      .returning();
    return r && toAccommodation(r);
  }

  async findByLegacyId(legacyId: string): Promise<Accommodation | undefined> {
    const [r] = await this.db
      .select()
      .from(accommodations)
      .where(eq(accommodations.legacyId, legacyId));
    return r && toAccommodation(r);
  }

  // --- Saisons ---
  async listSeasons(): Promise<Season[]> {
    const rows = await this.db.select().from(seasons).orderBy(asc(seasons.startDate));
    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      startDate: s.startDate,
      endDate: s.endDate,
    }));
  }

  async insertSeason(input: SeasonInput, legacyId?: string): Promise<Season> {
    const [s] = await this.db
      .insert(seasons)
      .values({ ...input, legacyId: legacyId ?? null })
      .returning();
    return { id: s!.id, name: s!.name, startDate: s!.startDate, endDate: s!.endDate };
  }

  async updateSeason(id: string, input: SeasonInput): Promise<Season | undefined> {
    const [s] = await this.db.update(seasons).set(input).where(eq(seasons.id, id)).returning();
    return s && { id: s.id, name: s.name, startDate: s.startDate, endDate: s.endDate };
  }

  async deleteSeason(id: string): Promise<void> {
    await this.db.delete(seasons).where(eq(seasons.id, id));
  }

  async findSeasonByLegacyId(legacyId: string): Promise<Season | undefined> {
    const [s] = await this.db.select().from(seasons).where(eq(seasons.legacyId, legacyId));
    return s && { id: s.id, name: s.name, startDate: s.startDate, endDate: s.endDate };
  }

  async listSeasonPrices(accommodationId: string): Promise<SeasonPrice[]> {
    const rows = await this.db
      .select()
      .from(seasonPrices)
      .where(eq(seasonPrices.accommodationId, accommodationId));
    return rows.map((r) => ({
      seasonId: r.seasonId,
      pricePerNight: r.pricePerNight,
      baseGuests: r.baseGuests,
      extraGuestPricePerNight: r.extraGuestPricePerNight,
      minNights: r.minNights,
    }));
  }

  /** Ersetzt alle Saisonpreise einer Unterkunft (Formular im Admin). */
  async replaceSeasonPrices(accommodationId: string, prices: SeasonPrice[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(seasonPrices).where(eq(seasonPrices.accommodationId, accommodationId));
      if (prices.length) {
        await tx.insert(seasonPrices).values(prices.map((p) => ({ ...p, accommodationId })));
      }
    });
  }

  // --- Zusatzleistungen ---
  async listExtras(activeOnly: boolean): Promise<Extra[]> {
    const rows = await this.db
      .select()
      .from(extras)
      .where(activeOnly ? eq(extras.active, true) : undefined)
      .orderBy(asc(extras.price));
    return rows.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      price: e.price,
      chargeType: e.chargeType,
      active: e.active,
    }));
  }

  async insertExtra(input: ExtraInput, legacyId?: string): Promise<Extra> {
    const [e] = await this.db
      .insert(extras)
      .values({ ...input, legacyId: legacyId ?? null })
      .returning();
    return {
      id: e!.id,
      name: e!.name,
      description: e!.description,
      price: e!.price,
      chargeType: e!.chargeType,
      active: e!.active,
    };
  }

  async updateExtra(id: string, input: ExtraInput): Promise<Extra | undefined> {
    const [e] = await this.db.update(extras).set(input).where(eq(extras.id, id)).returning();
    return (
      e && {
        id: e.id,
        name: e.name,
        description: e.description,
        price: e.price,
        chargeType: e.chargeType,
        active: e.active,
      }
    );
  }

  async findExtraByLegacyId(legacyId: string): Promise<Extra | undefined> {
    const [e] = await this.db
      .select()
      .from(extras)
      .where(and(eq(extras.legacyId, legacyId)));
    return (
      e && {
        id: e.id,
        name: e.name,
        description: e.description,
        price: e.price,
        chargeType: e.chargeType,
        active: e.active,
      }
    );
  }
}
