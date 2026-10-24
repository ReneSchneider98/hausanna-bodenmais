import { sanitizeRichText } from './sanitize.js';

describe('sanitizeRichText', () => {
  it('entfernt Skripte und Event-Handler, behält Formatierung', () => {
    const out = sanitizeRichText(
      '<p onclick="x()">Hallo <strong>Welt</strong><script>alert(1)</script></p>',
    );
    expect(out).toBe('<p>Hallo <strong>Welt</strong></p>');
  });

  it('erlaubt tel:/mailto:-Links und blockt javascript:', () => {
    expect(sanitizeRichText('<a href="tel:+49151">x</a>')).toContain('href="tel:+49151"');
    expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
  });
});
