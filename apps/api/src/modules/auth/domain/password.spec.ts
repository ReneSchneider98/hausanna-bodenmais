import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('prüft richtige und falsche Passwörter', async () => {
    const hash = await hashPassword('geheim-12345');
    expect(hash.startsWith('scrypt$')).toBe(true);
    await expect(verifyPassword('geheim-12345', hash)).resolves.toBe(true);
    await expect(verifyPassword('falsch-12345', hash)).resolves.toBe(false);
    await expect(verifyPassword('x', 'kaputt')).resolves.toBe(false);
  });
});
