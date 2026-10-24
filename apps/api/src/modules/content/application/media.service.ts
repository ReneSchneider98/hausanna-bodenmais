import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { type Db, ObjectId } from 'mongodb';
import type { MediaItem } from '@hausanna/shared';
import { ENV, type Env } from '../../../config/env.js';
import { DomainError, notFound } from '../../../common/domain-error.js';
import { MONGO_DB } from '../../../infrastructure/database/tokens.js';

/** Erlaubte Bildtypen – erkannt am Dateiinhalt (nicht am Namen). Kein SVG (Skript-Gefahr). */
const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: 'image/jpeg', ext: '.jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: 'image/png',
    ext: '.png',
    test: (b) =>
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  { mime: 'image/gif', ext: '.gif', test: (b) => b.subarray(0, 4).toString('latin1') === 'GIF8' },
  {
    mime: 'image/webp',
    ext: '.webp',
    test: (b) =>
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
  {
    mime: 'image/x-icon',
    ext: '.ico',
    test: (b) => b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0,
  },
];

export function detectImageType(data: Buffer): { mime: string; ext: string } | null {
  const hit = SIGNATURES.find((s) => s.test(data));
  return hit ? { mime: hit.mime, ext: hit.ext } : null;
}
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

interface MediaDoc extends Omit<MediaItem, 'id'> {
  _id?: ObjectId;
}

/** Dateiname für URLs: Kleinbuchstaben, keine Umlaute/Leerzeichen */
export function safeFileName(name: string): string {
  const ext = extname(name).toLowerCase();
  const base = name
    .slice(0, name.length - ext.length)
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'bild'}${ext}`;
}

/**
 * Bilder liegen im Dateisystem (UPLOAD_DIR), Metadaten in MongoDB.
 * Ausgeliefert unter /media/<ordner>/<datei> (lokal von der API, in Produktion von nginx).
 */
@Injectable()
export class MediaService {
  constructor(
    @Inject(MONGO_DB) private readonly db: Db,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private get col() {
    return this.db.collection<MediaDoc>('media');
  }

  get root(): string {
    return resolve(this.env.UPLOAD_DIR);
  }

  async list(): Promise<MediaItem[]> {
    const docs = await this.col.find().sort({ uploadedAt: -1 }).toArray();
    return docs.map(({ _id, ...m }) => ({ ...m, id: String(_id) }));
  }

  async findByFilename(folder: string, filename: string): Promise<MediaItem | undefined> {
    const doc = await this.col.findOne({ folder, filename });
    if (!doc) return undefined;
    const { _id, ...m } = doc;
    return { ...m, id: String(_id) };
  }

  async upload(
    file: { originalname: string; mimetype: string; buffer: Buffer; size: number },
    alt = '',
    folder = 'uploads',
  ): Promise<MediaItem> {
    const type = detectImageType(file.buffer);
    if (!type) throw new DomainError('validation', 'Nur Bilder (JPG, PNG, WebP, GIF, ICO) erlaubt');
    const ext = type.ext;
    if (file.size > MAX_UPLOAD_BYTES)
      throw new DomainError('validation', 'Datei zu groß (max. 15 MB)');
    const base = safeFileName(file.originalname).replace(/\.[a-z0-9]+$/, '');
    const filename = `${base}-${randomBytes(3).toString('hex')}${ext}`;
    return this.store(folder, filename, file.buffer, type.mime, alt);
  }

  /** Datei ablegen + Metadaten speichern (auch vom WordPress-Import genutzt). */
  async store(
    folder: string,
    filename: string,
    data: Buffer,
    mimeType: string,
    alt: string,
  ): Promise<MediaItem> {
    if (!/^[a-z0-9/_-]+$/.test(folder) || folder.includes('..')) {
      throw new DomainError('validation', 'Ungültiger Ordner');
    }
    const dir = join(this.root, folder);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), data);
    const doc: MediaDoc = {
      url: `/media/${folder}/${filename}`,
      filename,
      alt,
      mimeType,
      size: data.length,
      width: null,
      height: null,
      folder,
      uploadedAt: new Date().toISOString(),
    };
    await this.col.updateOne({ folder, filename }, { $set: doc }, { upsert: true });
    return (await this.findByFilename(folder, filename))!;
  }

  async updateAlt(id: string, alt: string): Promise<MediaItem> {
    if (!ObjectId.isValid(id)) throw notFound('Bild');
    const doc = await this.col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { alt } },
      { returnDocument: 'after' },
    );
    if (!doc) throw notFound('Bild');
    const { _id, ...m } = doc;
    return { ...m, id: String(_id) };
  }

  async delete(id: string): Promise<void> {
    if (!ObjectId.isValid(id)) throw notFound('Bild');
    const doc = await this.col.findOneAndDelete({ _id: new ObjectId(id) });
    if (!doc) throw notFound('Bild');
    const path = join(this.root, doc.folder, doc.filename);
    if (path.startsWith(this.root)) await rm(path, { force: true });
  }

  async exists(folder: string, filename: string): Promise<boolean> {
    return stat(join(this.root, folder, filename)).then(
      () => true,
      () => false,
    );
  }
}
