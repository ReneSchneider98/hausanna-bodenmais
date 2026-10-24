import { randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ohne 0/O/1/I

/** Lesbare Buchungsnummer, z. B. "HA-26-K7M3QX" */
export function newBookingReference(now = new Date()): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return `HA-${String(now.getUTCFullYear()).slice(2)}-${code}`;
}
