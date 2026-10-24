/** Fachlicher Fehler mit verständlicher (deutscher) Meldung. */
export class DomainError extends Error {
  constructor(
    readonly code:
      'not_found' | 'conflict' | 'validation' | 'forbidden' | 'unauthorized' | 'unavailable',
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new DomainError('not_found', `${what} nicht gefunden`);
