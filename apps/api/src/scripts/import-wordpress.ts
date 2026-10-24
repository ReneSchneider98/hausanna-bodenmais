/**
 * Import aus WordPress (Divi + MotoPress Hotel Booking).
 *
 *   pnpm import:wordpress -- --xml <export.xml> --uploads <ordner wp-content/uploads> [Optionen]
 *
 * Optionen:
 *   --preview <ordner>   nur JSON-Vorschau schreiben, nichts in Datenbanken ändern
 *   --skip-bookings      keine Buchungen importieren
 *   --overwrite-pages    vorhandene Seiten überschreiben (Standard: nur fehlende anlegen)
 *   --skip-content       Bilder/Seiten/Design (MongoDB) auslassen, nur Postgres-Daten
 *
 * Wiederholbar: Datensätze werden über ihre WordPress-ID wiedererkannt und aktualisiert.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { AccommodationsRepository } from '../modules/accommodations/infrastructure/accommodations.repository.js';
import { BookingsRepository } from '../modules/bookings/infrastructure/bookings.repository.js';
import { newBookingReference } from '../modules/bookings/domain/reference.js';
import { MediaService } from '../modules/content/application/media.service.js';
import { PagesService } from '../modules/content/application/pages.service.js';
import { SiteSettingsService } from '../modules/content/application/site-settings.service.js';
import { DomainError } from '../common/domain-error.js';
import { buildPlan, type ImportPlan } from './wordpress/mapper.js';
import { readWpExport } from './wordpress/wp-export.js';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

async function listFiles(root: string): Promise<Set<string>> {
  const out = new Set<string>();
  if (!root || !existsSync(root)) return out;
  const walk = async (dir: string) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else out.add(relative(root, p).split('\\').join('/'));
    }
  };
  await walk(root);
  return out;
}

function log(msg: string) {
  process.stdout.write(`${msg}\n`);
}

async function main() {
  const { values } = parseArgs({
    options: {
      xml: { type: 'string' },
      uploads: { type: 'string' },
      preview: { type: 'string' },
      'skip-bookings': { type: 'boolean', default: false },
      'overwrite-pages': { type: 'boolean', default: false },
      'skip-content': { type: 'boolean', default: false },
    },
  });
  if (!values.xml) throw new Error('--xml <datei> fehlt');
  const uploadsRoot = values.uploads ?? '';
  const known = await listFiles(uploadsRoot);
  if (uploadsRoot && known.size === 0) throw new Error(`Keine Dateien in ${uploadsRoot} gefunden`);

  const plan = buildPlan(readWpExport(await readFile(values.xml, 'utf8')), { knownUploads: known });
  log(
    `Gefunden: ${plan.accommodations.length} Unterkünfte, ${plan.seasons.length} Saisons, ${plan.extras.length} Zusatzleistungen, ${plan.bookings.length} Buchungen, ${plan.pages.length} Seiten, ${plan.media.length} Bilder`,
  );

  if (values.preview) {
    await mkdir(values.preview, { recursive: true });
    await writeFile(join(values.preview, 'import-plan.json'), JSON.stringify(plan, null, 2));
    log(`Vorschau geschrieben: ${join(values.preview, 'import-plan.json')}`);
    printWarnings(plan);
    return;
  }

  process.env.DISABLE_JOBS = 'true';
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    await importAll(app, plan, uploadsRoot, known, values);
  } finally {
    await app.close();
  }
  printWarnings(plan);
}

function printWarnings(plan: ImportPlan) {
  if (!plan.warnings.length) return;
  log(`\nHinweise (${plan.warnings.length}):`);
  for (const w of plan.warnings) log(`  - ${w}`);
}

async function importAll(
  app: Awaited<ReturnType<typeof NestFactory.createApplicationContext>>,
  plan: ImportPlan,
  uploadsRoot: string,
  known: Set<string>,
  opts: { 'skip-bookings'?: boolean; 'overwrite-pages'?: boolean; 'skip-content'?: boolean },
) {
  const accRepo = app.get(AccommodationsRepository);
  const bookingRepo = app.get(BookingsRepository);
  const media = app.get(MediaService);
  const pages = app.get(PagesService);
  const settings = app.get(SiteSettingsService);

  // 1. Bilder
  let copied = 0;
  for (const m of opts['skip-content'] ? [] : plan.media) {
    if (!m.path) continue;
    if (!known.has(m.path)) {
      plan.warnings.push(`Bild fehlt im Upload-Ordner: ${m.path}`);
      continue;
    }
    const folder = `wp/${dirname(m.path)}`.replace(/\/\.$/, '');
    const filename = m.path.split('/').pop()!;
    if (await media.exists(folder, filename)) continue;
    const mime = MIME[extname(filename).toLowerCase()] ?? 'application/octet-stream';
    await media.store(folder, filename, await readFile(join(uploadsRoot, m.path)), mime, m.alt);
    copied++;
  }
  log(`Bilder kopiert: ${copied}`);

  // 2. Zusatzleistungen
  for (const e of plan.extras) {
    const existing = await accRepo.findExtraByLegacyId(e.legacyId);
    if (existing) await accRepo.updateExtra(existing.id, e.input);
    else await accRepo.insertExtra(e.input, e.legacyId);
  }

  // 3. Saisons
  const seasonIds = new Map<string, string>();
  for (const s of plan.seasons) {
    const input = { name: s.name, startDate: s.startDate, endDate: s.endDate };
    const existing = await accRepo.findSeasonByLegacyId(s.legacyId);
    const saved = existing
      ? await accRepo.updateSeason(existing.id, input)
      : await accRepo.insertSeason(input, s.legacyId);
    seasonIds.set(s.legacyId, saved!.id);
  }

  // 4. Unterkünfte + Saisonpreise
  const accIds = new Map<string, string>();
  for (const a of plan.accommodations) {
    const existing = await accRepo.findByLegacyId(a.legacyId);
    const saved = existing
      ? await accRepo.update(existing.id, a.input)
      : await accRepo.insert(a.input, a.legacyId);
    accIds.set(a.legacyId, saved!.id);
    const prices = plan.seasonPrices
      .filter((p) => p.accommodationLegacyId === a.legacyId && seasonIds.has(p.seasonLegacyId))
      .map((p) => ({
        seasonId: seasonIds.get(p.seasonLegacyId)!,
        pricePerNight: p.pricePerNight,
        baseGuests: p.baseGuests,
        extraGuestPricePerNight: p.extraGuestPricePerNight,
        minNights: null,
      }));
    await accRepo.replaceSeasonPrices(saved!.id, prices);
  }
  log(`Unterkünfte: ${accIds.size}, Saisons: ${seasonIds.size}`);

  // 5. Buchungen
  if (!opts['skip-bookings']) {
    let created = 0;
    let updated = 0;
    for (const b of plan.bookings) {
      const accommodationId = accIds.get(b.accommodationLegacyId);
      if (!accommodationId) continue;
      const data = {
        accommodationId,
        arrival: b.arrival,
        departure: b.departure,
        adults: b.adults,
        children: b.children,
        status: b.status,
        source: b.source,
        externalRef: b.externalRef,
        guest: b.guest,
        note: b.note,
        totalPrice: b.totalPrice,
        channelSyncState: 'not_required' as const,
      };
      try {
        const existing = await bookingRepo.findByExternalRef(b.source, b.externalRef);
        if (existing) {
          await bookingRepo.update(existing.id, data);
          updated++;
        } else {
          await bookingRepo.insert({ ...data, reference: newBookingReference() });
          created++;
        }
      } catch (e) {
        if (e instanceof DomainError && e.code === 'conflict') {
          plan.warnings.push(
            `Buchung ${b.legacyId} (${b.arrival} – ${b.departure}) überschneidet sich mit einer anderen – nicht importiert, bitte prüfen`,
          );
        } else throw e;
      }
    }
    log(`Buchungen: ${created} neu, ${updated} aktualisiert`);
  }

  if (opts['skip-content']) return;

  // 6. Seiten (vorhandene nur mit --overwrite-pages ersetzen)
  const existingPages = new Set((await pages.list()).map((p) => p.slug));
  let pageCount = 0;
  for (const p of plan.pages) {
    if (existingPages.has(p.slug) && !opts['overwrite-pages']) continue;
    await pages.save(p);
    pageCount++;
  }
  log(`Seiten gespeichert: ${pageCount}`);

  // 7. Logo + Kopfbild ins Design übernehmen (nur wenn noch leer)
  const current = await settings.get();
  const img = (path: string | null) =>
    path ? { url: `/media/wp/${path}`, alt: 'Haus Anna Bodenmais' } : null;
  await settings.save({
    ...current,
    design: {
      ...current.design,
      logo: current.design.logo ?? img(plan.logoPath),
      headerImage: current.design.headerImage ?? img(plan.headerImagePath),
    },
  });
  log('Design: Logo/Kopfbild übernommen');
}

main().catch((e: unknown) => {
  process.stderr.write(`Import fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
