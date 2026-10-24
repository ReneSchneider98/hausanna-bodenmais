import { XMLParser } from 'fast-xml-parser';

/** Ein Eintrag (<item>) aus dem WordPress-WXR-Export. */
export interface WpItem {
  id: string;
  type: string;
  status: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  parent: string;
  menuOrder: number;
  attachmentUrl: string;
  meta: Record<string, string>;
}

type Raw = Record<string, unknown>;
const text = (v: unknown): string =>
  v == null ? '' : typeof v === 'object' ? text((v as Raw)['#text']) : String(v);
const asArray = <T>(v: T | T[] | undefined): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

export function readWpExport(xml: string): WpItem[] {
  const parser = new XMLParser({
    ignoreAttributes: true,
    cdataPropName: false,
    parseTagValue: false,
    trimValues: false,
    processEntities: true,
    htmlEntities: true,
  });
  const doc = parser.parse(xml) as Raw;
  const channel = (doc.rss as Raw).channel as Raw;
  return asArray(channel.item as Raw[]).map((i) => ({
    id: text(i['wp:post_id']),
    type: text(i['wp:post_type']),
    status: text(i['wp:status']),
    slug: text(i['wp:post_name']),
    title: text(i.title).trim(),
    content: text(i['content:encoded']),
    excerpt: text(i['excerpt:encoded']),
    parent: text(i['wp:post_parent']),
    menuOrder: Number(text(i['wp:menu_order']) || 0),
    attachmentUrl: text(i['wp:attachment_url']),
    meta: Object.fromEntries(
      asArray(i['wp:postmeta'] as Raw[]).map((m) => [
        text(m['wp:meta_key']),
        text(m['wp:meta_value']),
      ]),
    ),
  }));
}
