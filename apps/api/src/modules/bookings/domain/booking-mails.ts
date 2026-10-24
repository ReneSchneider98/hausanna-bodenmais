import { formatDateDe, formatEuro, type PriceQuote } from '@hausanna/shared';
import type { MailMessage } from '../../../infrastructure/mail/mail.port.js';

export interface BookingMailData {
  reference: string;
  accommodationName: string;
  arrival: string;
  departure: string;
  adults: number;
  children: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  note: string;
  quote: PriceQuote;
  checkInFrom: string;
  checkOutUntil: string;
  contactPhone: string;
  contactEmail: string;
}

function priceLines(d: BookingMailData): string {
  return [
    ...d.quote.lines.map((l) => `  ${l.label}: ${formatEuro(l.amount)}`),
    `  Gesamt: ${formatEuro(d.quote.total)}`,
  ].join('\n');
}

export function guestConfirmationMail(d: BookingMailData): MailMessage {
  return {
    to: d.guestEmail,
    replyTo: d.contactEmail,
    subject: `Buchungsbestätigung ${d.reference} – ${d.accommodationName}`,
    text: `Hallo ${d.guestName},

vielen Dank für Ihre Buchung im Haus Anna in Bodenmais!

Buchungsnummer: ${d.reference}
Unterkunft:     ${d.accommodationName}
Anreise:        ${formatDateDe(d.arrival)} ab ${d.checkInFrom} Uhr
Abreise:        ${formatDateDe(d.departure)} bis ${d.checkOutUntil} Uhr
Personen:       ${d.adults} Erwachsene${d.children ? `, ${d.children} Kinder` : ''}

Preis:
${priceLines(d)}

Den Code für den Schlüsseltresor erhalten Sie rechtzeitig vor der Anreise per E-Mail.

Bei Fragen erreichen Sie uns unter ${d.contactPhone} oder ${d.contactEmail}.

Wir freuen uns auf Sie!
Ihr Haus Anna Bodenmais`,
  };
}

export function ownerNotificationMail(d: BookingMailData, to: string): MailMessage {
  return {
    to,
    replyTo: d.guestEmail,
    subject: `Neue Buchung ${d.reference}: ${d.accommodationName}, ${formatDateDe(d.arrival)}–${formatDateDe(d.departure)}`,
    text: `Neue Buchung über die Webseite

${d.reference} – ${d.accommodationName}
${formatDateDe(d.arrival)} bis ${formatDateDe(d.departure)} (${d.quote.nights} Nächte)
Gast: ${d.guestName}, ${d.guestEmail}, ${d.guestPhone}
Personen: ${d.adults} Erwachsene, ${d.children} Kinder

${priceLines(d)}

Nachricht des Gastes:
${d.note || '–'}`,
  };
}
