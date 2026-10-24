# Analyse der bestehenden Seite (Stand 24.10.2026)

## Technik
- WordPress 7.1.3, Theme **Divi 4.27.9** + „Free Divi Child Theme by Pee-Aye Creative“
- Buchung: **MotoPress Hotel Booking 6.3.0** (+ mphb-divi, mphb-styles)
- Cookie-Banner: Complianz GDPR
- Nur Deutsch

## Seiten
| Seite | URL |
|---|---|
| Startseite | `/` |
| Ferienwohnung 2 | `/ferienwohnung-2-haus-anna/` |
| Ferienwohnung 3 | `/ferienwohnung-3-haus-anna/` |
| Ferienwohnung 4 | `/ferienwohnung-4-haus-anna/` |
| Apartment 5 | `/apartment-5-haus-anna/` |
| Apartment 6 | `/apartment-6-haus-anna/` |
| Service und häufige Fragen | `/service-und-haeufige-fragen/` |
| Ausflugstipps | `/ausflugstipps-rund-um-das-ferienhaus-anna/` |
| Kontakt | `/kontakt/` |
| Impressum / Datenschutz | `/impressum/`, `/datenschutz/` |

URLs beim Neubau beibehalten (SEO).

## Unterkünfte
| Einheit | Größe | max. Personen | Besonderheit |
|---|---|---|---|
| Ferienwohnung 2 | 52 m² | 4 | Balkon, bodengleiche Dusche, EG |
| Ferienwohnung 3 | 52 m² | 4 | großer Balkon |
| Ferienwohnung 4 | 54 m² | 4 | zwei Etagen, Terrasse mit Gartenzugang |
| Apartment 5 | 32 m² | 4 | Terrasse/Garten |
| Apartment 6 | 32 m² | 3 | Terrasse/Garten |

Beispiel Preise (FeWo 2): 100 €/Nacht für 2 Personen, +20 €/weitere Person/Nacht, Hund einmalig 20 €, min. 3 Nächte, saisonal abweichend.

## Unterkunfts-Seite (Aufbau)
1. Header-Bild mit Logo, Navigation
2. H1 + Kurzbeschreibung
3. Ausstattungslisten: Küche & Geräte · Bad · Wohnen & Schlafen · Inklusive-Leistungen · Außenbereich · Infrastruktur & Sonstiges
4. Preise & Mindestaufenthalt
5. Buchungsformular (Anreise, Abreise)
6. Bildergalerie (Lightbox)
7. Kontaktblock, Footer

## Startseite (Aufbau)
1. Hero mit Hintergrundbild (`home_header.jpg`) und Begrüßung
2. Einleitungstext
3. Teaser-Karten der 5 Unterkünfte („Mehr lesen“)
4. Kontaktblock
5. Footer (Impressum, Datenschutz, ©)

## Design
| Element | Wert |
|---|---|
| Fließtext | Open Sans 14 px, `#666666` |
| Überschriften (Zierschrift) | Montez, z. B. H2 26 px |
| H3 | Open Sans 20 px, 500, `#8E8B7D` |
| Navigation | Open Sans 16 px, 600, `#755B00` |
| Akzent dunkel | `#513E00` |
| Hintergrund | `#FFFFFF` |
| Section-Trenner | SVG-Welle (Divi Section Divider) |

## Service / FAQ
Anreise, Check-in ab 15:00, Check-out bis 10:00, Schlüsseltresor (Code per Mail), Mindestaufenthalt 3 Nächte (ab 01.01.2026), Nichtraucher, Supermarkt.

## Kontakt
Pfarrer-Schedlbauer-Straße 24, 94249 Bodenmais · +49 151 11227431 · info@hausanna-bodenmais.de. Kein Kontaktformular.

## Zu migrieren
- Texte, Fotos (wp-content/uploads)
- Unterkünfte, Preise, Saisons aus MotoPress
- Bestehende **zukünftige Buchungen** aus MotoPress
- Bestehende iCal-Verbindungen zu Booking.com prüfen und durch Beds24 ersetzen
