/** Parser für Divi-Shortcodes ([et_pb_section …]…[/et_pb_section]) zu einem Baum. */
export interface ShortcodeNode {
  tag: string;
  attrs: Record<string, string>;
  /** Text/HTML direkt im Modul (ohne Kind-Module) */
  content: string;
  children: ShortcodeNode[];
}

const TOKEN = /\[(\/)?(et_pb_[a-z0-9_]+)((?:[^\]"]|"[^"]*")*)\]/g;

export function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of raw.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[m[1]!] = m[2]!;
  return attrs;
}

export function parseShortcodes(input: string): ShortcodeNode[] {
  const root: ShortcodeNode = { tag: 'root', attrs: {}, content: '', children: [] };
  const stack: ShortcodeNode[] = [root];
  let last = 0;
  for (const m of input.matchAll(TOKEN)) {
    const top = stack.at(-1)!;
    top.content += input.slice(last, m.index);
    last = m.index! + m[0].length;
    const [, closing, tag, rawAttrs = ''] = m;
    if (closing) {
      const idx = stack.map((n) => n.tag).lastIndexOf(tag!);
      if (idx > 0) stack.length = idx;
      continue;
    }
    const node: ShortcodeNode = {
      tag: tag!,
      attrs: parseAttrs(rawAttrs),
      content: '',
      children: [],
    };
    top.children.push(node);
    if (!rawAttrs.trimEnd().endsWith('/')) stack.push(node);
  }
  stack.at(-1)!.content += input.slice(last);
  return root.children;
}

/** Alle Knoten eines Typs (Tiefensuche, Dokumentreihenfolge). */
export function findAll(nodes: ShortcodeNode[], tag: string): ShortcodeNode[] {
  const out: ShortcodeNode[] = [];
  const walk = (list: ShortcodeNode[]) => {
    for (const n of list) {
      if (n.tag === tag) out.push(n);
      walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/** Inhaltsmodule (keine Struktur wie section/row/column) in Reihenfolge. */
export function contentModules(nodes: ShortcodeNode[]): ShortcodeNode[] {
  const STRUCTURE = new Set([
    'et_pb_section',
    'et_pb_row',
    'et_pb_row_inner',
    'et_pb_column',
    'et_pb_column_inner',
  ]);
  const out: ShortcodeNode[] = [];
  const walk = (list: ShortcodeNode[]) => {
    for (const n of list) {
      if (STRUCTURE.has(n.tag)) walk(n.children);
      else out.push(n);
    }
  };
  walk(nodes);
  return out;
}
