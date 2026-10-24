# Entscheidungen

| # | Datum | Entscheidung | Begründung |
|---|---|---|---|
| 1 | 24.10.2026 | Stack: React + NestJS (TypeScript), PostgreSQL + MongoDB | Vorgabe |
| 2 | 24.10.2026 | Postgres für Unterkünfte, Preise, Buchungen, Nutzer. MongoDB für Logs, Design, Inhalte | relationale Daten mit Transaktionen gehören in Postgres |
| 3 | 24.10.2026 | Unser Backend ist Master für alle Buchungen | Single Source of Truth |
| 4 | 24.10.2026 | Kanäle über hexagonalen Channel-Port | weitere Portale ohne Umbau anbindbar |
| 5 | 24.10.2026 | Booking.com + Airbnb über **Beds24** (ca. 11 €/Monat) | Die Booking.com Connectivity API gibt es nur für zertifizierte Partner. Mit iCal allein (Sync ca. alle 2 Std.) wäre zwischen den Portalen keine sichere Sofortbuchung möglich |
| 6 | 24.10.2026 | iCal-Adapter bleibt als kostenlose Alternative im Code | Fallback, falls Beds24 gekündigt wird |
| 7 | 24.10.2026 | Keine Online-Zahlung, nur Buchung (Zahlung wie bisher) | Wunsch Kundin |
| 8 | 24.10.2026 | Design-Seite: Farben, Fonts, Logo, Bilder, Texte, aber kein Page-Builder | Aufwand / Nutzen |
| 9 | 24.10.2026 | Hosting: IONOS VPS mit AlmaLinux 10 | Vorgabe |
