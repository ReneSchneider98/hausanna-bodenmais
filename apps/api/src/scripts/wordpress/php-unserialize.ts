/** Minimaler PHP-unserialize für WordPress-Metadaten (a, s, i, d, b, N). */
export type PhpValue = string | number | boolean | null | PhpValue[] | { [k: string]: PhpValue };

export function phpUnserialize(input: string): PhpValue {
  const buf = Buffer.from(input, 'utf8');
  let pos = 0;
  const readUntil = (ch: string) => {
    const end = buf.indexOf(ch, pos);
    if (end < 0) throw new Error('Ungültige PHP-Serialisierung');
    const s = buf.subarray(pos, end).toString('utf8');
    pos = end + 1;
    return s;
  };
  const parse = (): PhpValue => {
    const type = String.fromCharCode(buf[pos]!);
    pos += 2; // "x:"
    switch (type) {
      case 'N':
        pos -= 1;
        return null;
      case 'b':
        return readUntil(';') === '1';
      case 'i':
        return parseInt(readUntil(';'), 10);
      case 'd':
        return parseFloat(readUntil(';'));
      case 's': {
        const len = parseInt(readUntil(':'), 10);
        pos += 1; // "
        const s = buf.subarray(pos, pos + len).toString('utf8');
        pos += len + 2; // ";
        return s;
      }
      case 'a': {
        const count = parseInt(readUntil(':'), 10);
        pos += 1; // {
        const obj: Record<string, PhpValue> = {};
        let isList = true;
        for (let i = 0; i < count; i++) {
          const key = parse();
          const value = parse();
          if (key !== i) isList = false;
          obj[String(key)] = value;
        }
        pos += 1; // }
        return isList ? Object.values(obj) : obj;
      }
      default:
        throw new Error(`Unbekannter PHP-Typ "${type}"`);
    }
  };
  return parse();
}
