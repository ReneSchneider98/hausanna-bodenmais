import { phpUnserialize } from './php-unserialize.js';
import { contentModules, findAll, parseShortcodes } from './shortcodes.js';

describe('phpUnserialize', () => {
  it('liest verschachtelte Arrays, Strings mit Umlauten, Zahlen', () => {
    const v = phpUnserialize(
      'a:2:{i:0;a:2:{s:6:"season";s:3:"778";s:5:"price";d:120.5;}i:1;s:7:"Größe";}',
    );
    expect(v).toEqual([{ season: '778', price: 120.5 }, 'Größe']);
    expect(phpUnserialize('a:1:{s:1:"x";b:1;}')).toEqual({ x: true });
  });
});

describe('parseShortcodes', () => {
  it('baut den Modulbaum inkl. selbstschließender Module', () => {
    const tree = parseShortcodes(
      '[et_pb_section][et_pb_row][et_pb_column type="4_4"][et_pb_text]<p>Hallo</p>[/et_pb_text][et_pb_image src="a.jpg" /][et_pb_accordion][et_pb_accordion_item title="Frage?" open="on"]<p>Antwort</p>[/et_pb_accordion_item][/et_pb_accordion][/et_pb_column][/et_pb_row][/et_pb_section]',
    );
    const mods = contentModules(tree);
    expect(mods.map((m) => m.tag)).toEqual(['et_pb_text', 'et_pb_image', 'et_pb_accordion']);
    expect(mods[0]!.content).toBe('<p>Hallo</p>');
    expect(mods[1]!.attrs.src).toBe('a.jpg');
    expect(findAll(tree, 'et_pb_accordion_item')[0]).toMatchObject({
      attrs: { title: 'Frage?', open: 'on' },
      content: '<p>Antwort</p>',
    });
  });
});

import { parseAmenities } from './mapper.js';

describe('parseAmenities', () => {
  it('erkennt beide Schreibweisen (Absätze und <br>, geteilte <strong>)', () => {
    expect(
      parseAmenities(
        '<p><strong>Bad:</strong> Dusche, WC</p><p><strong>Infrastruktur &amp;</strong><strong> Sonstiges:</strong> Nichtraucher, Wallbox</p>',
      ),
    ).toEqual([
      { title: 'Bad', items: ['Dusche', 'WC'] },
      { title: 'Infrastruktur & Sonstiges', items: ['Nichtraucher', 'Wallbox'] },
    ]);
    expect(
      parseAmenities(
        '<p><strong>Küche &amp; Geräte:</strong><br>Herd, Ofen<br><br><strong>Lage:</strong><br>ruhig</p>',
      ),
    ).toEqual([
      { title: 'Küche & Geräte', items: ['Herd', 'Ofen'] },
      { title: 'Lage', items: ['ruhig'] },
    ]);
  });
});

import { cleanHtml } from './mapper.js';

describe('cleanHtml', () => {
  it('repariert kaputte Tags und erzeugt Absätze wie WordPress', () => {
    const html = cleanHtml(
      '<h2>Titel</h2>\n\nZeile 1\nZeile 2\n\n<h2Kontakt</h2>\n\nTel: 123',
      new Set(),
    );
    expect(html).toBe('<h2>Titel</h2><p>Zeile 1<br />Zeile 2</p><h2>Kontakt</h2><p>Tel: 123</p>');
  });
});
