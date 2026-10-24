# Design-Spezifikation – öffentliche Seite (Ist-Zustand hausanna-bodenmais.de)

Gemessen am 24.10.2026 per Browser (Desktop 1280×900 → Inhaltsbreite 1265 px wegen Scrollbar, Mobile 375×812).
Werte sind berechnete CSS-Werte. Texte kommen aus dem WordPress-Import und stehen hier nicht.
Referenz-Screenshots: `data/reference/*.jpg` (gitignored).

> Ziel ist der optische Nachbau mit eigenem CSS. Divi-Code wird **nicht** übernommen.

---

## 1. Globale Tokens

### Farben

| Token                | Wert                     | Verwendung                                               |
| -------------------- | ------------------------ | -------------------------------------------------------- |
| `--c-text`           | `#666666`                | Fließtext                                                |
| `--c-heading`        | `#333333`                | H1/H2 (Montez), Footer-Texte, „Mehr lesen“               |
| `--c-heading-muted`  | `#8e8b7d`                | H3 der Teaser-Karten, Akkordeon-Icon                     |
| `--c-nav`            | `#545454`                | Menülinks                                                |
| `--c-nav-active`     | `#755b00`                | aktiver Menülink, Hamburger-Icon, mobile Menülinks       |
| `--c-accent-dark`    | `#513e00`                | Links im Inhalt (fett), z. B. „Standort mit Google Maps“ |
| `--c-olive`          | `#384400`                | H2 auf der Service-Seite                                 |
| `--c-copyright`      | `#777777`                | Copyright-Zeile (kursiv)                                 |
| `--c-bg`             | `#ffffff`                | Seitenhintergrund                                        |
| `--c-header-row`     | `#fdfdfd`                | Innenzeile des Headers                                   |
| `--c-band`           | `rgba(142,114,0,0.11)`   | Hintergrund der Teaser-Reihe (Startseite)                |
| `--c-footer`         | `rgba(142,114,0,0.24)`   | Footer-Hintergrund (≈ `#e5dbbf` auf Weiß)                |
| `--c-card`           | `rgba(255,255,255,0.82)` | Teaser-Karten                                            |
| `--c-details`        | `rgba(142,114,0,0.18)`   | Box „Details …“ (Unterkunft)                             |
| `--c-pricebox`       | `rgba(201,177,98,0.17)`  | Box „Preis und Mindestaufenthalt“                        |
| `--c-formbox`        | `rgba(163,152,110,0.59)` | Box mit Buchungsformular                                 |
| `--c-faq-closed`     | `rgba(109,93,0,0.15)`    | geschlossenes FAQ-Element                                |
| `--c-faq-border`     | `#d9d9d9`                | Rahmen FAQ-Element                                       |
| `--c-btn-bg`         | `#e0c488`                | Buchungs-Button Hintergrund                              |
| `--c-btn-text`       | `#58583e`                | Buchungs-Button Text                                     |
| `--c-btn-border`     | `rgba(104,69,0,0.24)`    | Buchungs-Button Rahmen                                   |
| `--c-input-border`   | `#bbbbbb`                | Eingabefelder                                            |
| `--c-input-text`     | `#4e4e4e`                | Eingabefelder                                            |
| `--c-label`          | `#1c1c1c`                | Formular-Labels                                          |
| `--c-icon-gold`      | `rgba(201,154,0,0.92)`   | Info-Icon Preisbox                                       |
| `--c-cal-free`       | `#c1eed1`                | Kalender: frei                                           |
| `--c-cal-booked`     | `#f8cccc`                | Kalender: belegt                                         |
| `--c-cal-nav`        | `#363636`                | Kalender-Kopfleiste                                      |
| `--c-cal-month`      | `#f2f2f2`                | Kalender-Monatskopf                                      |
| `--c-cal-muted`      | `#acacac` / `#cccccc`    | Wochentage, vergangene/belegte Ziffern                   |
| `--c-divider-dotted` | `rgba(0,0,0,0.3)`        | gepunktete Linie unter H1 (Unterkunft)                   |
| `--c-header-border`  | `#c9c9c9`                | gepunktete Linie unter dem Header im Sticky-Zustand      |

### Schriften (selbst hosten, z. B. @fontsource)

- **Open Sans**: 400, 400 italic, 500, 600, 700 (latin + latin-ext). Fließtext, Menü, H3/H4.
- **Montez**: 400 (latin + latin-ext). Alle „Zierschrift“-Überschriften (H1, H2, Footer-„Kontakt“, Ausflugstipps-Titel).
- Fallbacks: `'Open Sans', Helvetica, Arial, Lucida, sans-serif` und `'Montez', cursive`.

### Typografie

| Element                | Desktop                                                                           | Mobile (≤767)            |
| ---------------------- | --------------------------------------------------------------------------------- | ------------------------ |
| body                   | Open Sans 14px / 1.7 (23.8px), #666                                               | 14px / 23.8px            |
| strong                 | 700, Farbe erbt                                                                   |                          |
| H1 (Seitentitel)       | Montez 30px / 1, 400, #333, padding-bottom 10px                                   | 30px                     |
| H2 Hero                | Montez 46px / 1, #fff, text-shadow `0 1px 3px rgba(0,0,0,.3)`, zentriert, pb 10px | 20px                     |
| H2 Inhalt (Startseite) | Montez 26px / 1, #333, pb 10px                                                    | 26px                     |
| H2 Service-Seite       | Montez 42px / 1, #384400                                                          | ca. 30px (Divi skaliert) |
| H3 Teaser-Karte        | Open Sans 20px / 1, 500, #8e8b7d, pb 10px, links                                  |                          |
| H3 „Details …“         | Open Sans 22px / 1, 400, #333, pb 10px                                            |                          |
| H3 Footer „Kontakt“    | Montez (wie H2, ~26px), #333                                                      |                          |
| H4 Preisbox            | Open Sans 18px / 1, 700, #333, pb 10px                                            |                          |
| H4 FAQ-Titel           | Open Sans 16px / 1, 600; offen #000, geschlossen #474747                          |                          |
| H4 Ausflugstipps       | Montez 26px / 1, #333, pb 10px                                                    |                          |
| Hero-Text              | 15px / 23.8px, #fff, Fettungen 700                                                | 14px                     |
| p                      | margin 0, padding-bottom 14px (letztes p ohne)                                    |                          |

### Layout / Abstände

- **Content-Breite (Row):** `width: 80%; max-width: 1080px; margin: 0 auto` → 1012px bei 1265px Viewport. Mobile: 80% → 300px bei 375px.
- **Section-Padding:** 50.6px oben/unten (≈ 4% der Breite). Mobile: 50px.
- **Row-Padding:** 25.3px oben/unten (≈ 2%). Mobile: 30px oben.
- **Spalten:** 2 Spalten = je 478px mit 55.7px Lücke (≈ 5.5%); 3 Spalten = je 300px, Lücke ≈ 55px; 5 Spalten (Teaser) = je 209px, Lücke 35.7px.
- **Modul-Abstand vertikal:** 27.8px (≈ 2.75%) margin-bottom.
- **Breakpoints:** ≤980px Tablet (Spalten untereinander, Menü → Hamburger), ≤767px Phone. Bei 375px ist alles einspaltig. Das Tablet-Verhalten wurde nicht einzeln gemessen, hier die Divi-Standardwerte annehmen.

### Radien & Schatten

| Token               | Wert                                                                        |
| ------------------- | --------------------------------------------------------------------------- |
| `--r-card`          | 30px (Teaser-Karte), Bild-Wrapper 20px                                      |
| `--r-details`       | 32px                                                                        |
| `--r-pricebox`      | 26px                                                                        |
| `--r-formbox`       | 22px                                                                        |
| `--r-gallery`       | 24px                                                                        |
| `--r-image`         | 26px (Kontakt-Bild)                                                         |
| `--r-faq`           | 16px                                                                        |
| `--r-btn`           | 3px                                                                         |
| `--shadow-box`      | `0 12px 18px -6px rgba(0,0,0,.3)` (Details, Preisbox, Teaser-Section unten) |
| `--shadow-form`     | `6px 6px 18px 0 rgba(0,0,0,.3)` (Formularbox)                               |
| `--shadow-dropdown` | `0 2px 5px rgba(0,0,0,.1)`                                                  |

---

## 2. Header

- Wrapper weiß, Innenzeile `#fdfdfd`, Breite wie Content-Row (1012px).
- Aufbau: links Logo-Bereich (Platz 220px, sticky 190px), danach Menü linksbündig (`justify-content: flex-start`).
- **Achtung Ist-Zustand:** Das Logo-Bild `2025/06/haus-anna-bodenmais.png` lädt auf der Live-Seite nicht (0×0). Es bleibt eine leere Fläche von ca. 210px. Für den Nachbau das Logo aus den Uploads verwenden, falls die Datei gültig ist, sonst einen Platzhalter (Schriftzug „Haus Anna“ in Montez).
- Menülinks: Open Sans 16px, 600, `#545454`; aktiv `#755b00`. `li` padding 0 11px, Link padding 31px 0 (Zeilenhöhe 76px). Der Punkt mit Untermenü hat rechts 20px Platz für ein Chevron-Icon (16px).
- Bei 1265px bricht „Kontakt“ in eine zweite Zeile um, dadurch ist der Header oben 152px hoch. Beim Nachbau so lösen, dass alle Links in einer Zeile passen (z. B. Logo verkleinern oder Gap verringern). Im Sticky-Zustand (14px Schrift) passt es bereits in eine Zeile.
- **Sticky:** Ab dem Scrollen `position: fixed; top: 0`, Höhe 77px, Menü-Schrift 14px, Logo 190px, `border-bottom: 1px dotted #c9c9c9`. Auf Unterseiten ohne Hero ist der Header gleich sticky (76px).
- **Dropdown:** Breite 240px, weiß, `box-shadow: 0 2px 5px rgba(0,0,0,.1)`, padding 20px 0, `border-top: 3px solid transparent`, Fade-Animation. Links 16px, 600, `#666`, padding 6px 20px, line-height 28px, Breite 200px. Einträge im Format „Ferienwohnung 2: bis 4 Personen“ (Reihenfolge FeWo 2, 3, 4, Apt 5, 6). Der Hauptpunkt „Apartments und Ferienwohnungen“ hat keinen Link (`#`).
- **Mobile (≤980):** Header 32px hoch (plus Logo, falls vorhanden), rechts ein Hamburger-Icon 32px `#755b00`. Menü klappt als Panel auf: `position: absolute`, Breite 100% der Row (300px), weiß, padding 15px, Schatten wie Dropdown. Links: 16px, 600, `#755b00` (aktiv) / `#6b6b6b`, padding 10px 13.5px, `border-bottom: 1px solid rgba(0,0,0,.03)`, line-height 26px. Untermenü-Einträge eingerückt (padding-left ≈ 12px extra, `#6b6b6b`). Der Untermenü-Elternpunkt hat einen grauen Hintergrund (`rgba(0,0,0,.03)`).

---

## 3. Footer

- Hintergrund `rgba(142,114,0,0.24)`, padding-top 50.6px, padding-bottom 14px.
- **Wellen-Trenner oben** (innen, 40px hoch, Breite 100%, `background-size: 100% 40px`): weiße Fläche oben mit welliger Unterkante: links hoch, ab ca. 25% Breite flach abfallend, rechts eine flache Senke. Eigenes SVG zeichnen, z. B.:
  ```svg
  <svg viewBox="0 0 1280 140" preserveAspectRatio="none"><path fill="#fff" d="M0 0h1280v72c-140 30-300 36-460 22C620 76 460 22 300 26 170 29 80 50 0 70z"/></svg>
  ```
  (Nur nachempfunden, nicht der Divi-Pfad.)
- Zeile 1: 2 Spalten (je 478px, Lücke 55px):
  - links: H3 „Kontakt“ (Montez, #333), darunter Adresse, Telefon, E-Mail (`mailto:`), alles 14px / 23.8px, Farbe `#333`, Links ohne Unterstreichung.
  - rechts: Links „Impressum“ und „Datenschutz“ untereinander (je ein p), `#333`, 14px.
- Zeile 2: Copyright „Haus Anna Bodenmais, {Jahr}“, zentriert, kursiv, `#777`, 14px. Auf der Live-Seite ist die Zeile um 126px nach rechts versetzt (Divi-Bug). Im Nachbau einfach zentrieren.
- Mobile: Spalten untereinander, linke Spalte margin-bottom 30px.

---

## 4. Seiten

### 4.1 Startseite `/`

1. **Hero** (Section ohne Padding): Hintergrundbild `2025/06/home_header.jpg`, `background-size: cover; background-position: center`. Höhe 507px Desktop / 326px Mobile. Kein zusätzliches Overlay, die warme/olivfarbene Tönung ist im Bild selbst. Inhalt zentriert mit padding 178px oben/unten (Mobile 53px). H2 (Montez 46px weiß) plus 4 Zeilen Text (15px weiß, fett). Text-Shadow `0 1px 3px rgba(0,0,0,.3)`. Einblende-Animation „fade from bottom“. Keine Pfeile, keine Punkte (nur ein Slide).
2. **Intro** (weiße Section, Row 1012px): H2 26px Montez #333, danach 2–3 Absätze Fließtext.
3. **Teaser-Section**: weiß, padding-bottom 70px, `box-shadow: 0 12px 18px -6px rgba(0,0,0,.3)`. Darin eine **volle Breite** Row (100%, padding 25.3px 37.9px), Hintergrund `rgba(142,114,0,0.11)`, 5 Spalten × 209px (Lücke 35.7px). Je Spalte eine **Teaser-Karte** (siehe Komponenten). Reihenfolge: Apartment 5, Apartment 6, Ferienwohnung 2, Ferienwohnung 3, Ferienwohnung 4. Bilder: `2026/04/appartment-5_003.jpg`, `2026/04/appartment-6_002.jpg`, `2026/04/ferienwohnung2.jpg`, `2026/04/ferienwohnung3.jpg` (alle 800×600 → 4:3), `2026/04/ferienwohnung4.jpg` (1280×1707, Hochformat, wird auf der Live-Seite höher dargestellt → im Nachbau einheitlich `aspect-ratio: 4/3; object-fit: cover`).
   Mobile: Row padding 11.25px, Karten untereinander, je 353px breit, Abstand ca. 30px.
4. Footer.

### 4.2 Unterkunftsseite (z. B. `/ferienwohnung-2-haus-anna/`)

Eine Section (weiß, padding 50.6px), 2 Rows:

1. Row 1 (1 Spalte):
   - **Titel-Modul**: H1 Montez 30px #333, Modul mit `border-bottom: 1px dotted rgba(0,0,0,.3)`, margin-bottom 27.8px.
   - **Beschreibung** (HTML aus der Unterkunft): 14px, Fettungen.
2. Row 2 (2 Spalten à 478px):
   - **Links:** (a) **Details-Box**, (b) **Preisbox**, (c) **Buchungsformular-Box**, (d) bei FeWo 2 der **Verfügbarkeitskalender**.
   - **Rechts:** **Galerie** (Grid). Bei Apartment 6 steht der Kalender rechts unter der Galerie.
   - → Im Nachbau einheitlich: links Details, Preis, Formular, Kalender; rechts Galerie.
   - Mobile: alles einspaltig in der Reihenfolge Titel, Beschreibung, Details, Preis, Formular, Kalender, Galerie.

- Galerie-Bilder FeWo 2: `2025/06/20251203_125808-rotated.jpg`, `…130131-rotated.jpg`, `…130101-rotated.jpg`, `…125920-rotated.jpg`, `…125820-rotated.jpg`, `…125828-rotated.jpg`, `2025/06/fewo2_007.jpg`, `2026/08/20260614_100011-1-scaled.jpg`, `2026/08/20260530_114713-scaled.jpg`, `2026/07/20260418_100924-scaled.jpg` (Quelle: Galerie-IDs bzw. `mphb_gallery` im Import).
- Apartment 6: `2025/06/appartment-6_004.jpg`, `_002`, `_001`, `_003`.

### 4.3 Service und häufige Fragen

- Eine Section, eine Row (1 Spalte). H2 Montez 42px `#384400`. Darunter ein **Akkordeon** mit 6 Einträgen (das erste ist offen). Siehe Komponente FAQ.

### 4.4 Ausflugstipps

- Row 1: H1 Montez 30px, darunter eine Zeile Untertitel (14px).
- Row 2: **Galerie** über die volle Breite: 4 Spalten à 230px, Lücke 30.4px, Radius 24px, Bilder 400×284 (≈ 1.41:1), 8 Bilder (2 Reihen).
- Row 3–8: je 3 Spalten (300px) mit **Tipp-Blurbs**: Icon links (32px, Farbe `#295b0f`, wird auf der Live-Seite praktisch nicht angezeigt), Titel H4 Montez 26px #333, darunter Kurzinfos (Kategorie * Kategorie * Schwierigkeit), Entfernung, Beschreibung, „**Tipp** …“. Alles 14px / 23.8px #666. Text beginnt 47px rechts vom Spaltenrand (Platz fürs Icon). 18 Blurbs.
- Die Inhalte sind redaktionell. Als Rich-Text-Block aus dem Import übernehmen, das Grid per CSS (3 Spalten → 1 Spalte mobil).

### 4.5 Kontakt

- Eine Row, 2 Spalten (484px): links H1 „Kontakt“ (Montez 30px) und Adresse/Tel./E-Mail (14px / 23.8px), rechts Bild `2025/06/garten_001.jpg` (484×363, 4:3) mit Radius 26px (`overflow: hidden`). Kein Formular, keine Karte.
- Mobile: einspaltig, Bild unter dem Text.

### 4.6 Impressum / Datenschutz

- Eine Row, 1 Spalte, H1 Montez 30px, Zwischenüberschriften H2 Montez 26px #333, Fließtext 14px. Inhalt aus dem Import (Rich Text).

---

## 5. Komponenten

### Card (Teaser Startseite)

```css
.card {
  background: rgba(255, 255, 255, 0.82);
  border-radius: 30px;
  overflow: hidden;
  text-align: left;
}
.card__img {
  display: block;
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
  border-radius: 20px 20px 0 0;
  margin-bottom: 30px;
}
.card__title {
  font: 500 20px/1 'Open Sans';
  color: #8e8b7d;
  padding: 0 0 10px;
}
.card__text {
  font-size: 14px;
  line-height: 23.8px;
  color: #666;
}
.card__more {
  color: #333;
  font-weight: 700;
  text-decoration: none;
} /* „Mehr lesen“, letzte Zeile, Link auf die Unterkunft */
```

Auf der Live-Seite ist „Mehr lesen“ teils 400, teils 700 und einmal `#513e00`. Vereinheitlichen auf 700 / #333. Innenabstand Text: ca. 0 2px (eng). Mehr Luft wirkt besser, z. B. `padding: 0 16px 24px`, das gilt dann aber als Abweichung.

### Button (Buchung)

```css
.btn {
  background: #e0c488;
  color: #58583e;
  border: 1px solid rgba(104, 69, 0, 0.24);
  border-radius: 3px;
  font: 700 16px/1.7 'Open Sans';
  padding: 4.8px 16px;
  cursor: pointer;
}
```

(Live: „Verfügbarkeit prüfen“, 203×39px.) Hover: etwas dunkler (`#d6b670`), da nicht gemessen.

### BookingForm (Box)

- Box: Hintergrund `rgba(163,152,110,.59)`, Radius 22px, padding 9.6px, `box-shadow: 6px 6px 18px rgba(0,0,0,.3)`.
- Labels 14px 400 `#1c1c1c` mit `*` (abbr, unterstrichen gepunktet), darunter `<br>`.
- Inputs: 214×43px, weiß, `1px solid #bbb`, Radius 0, Schrift 13.3px `#4e4e4e`, padding 11.7px 16.7px, Platzhalter „Anreisedatum“ / „Abreisedatum“. Datumsformat dd.mm.yyyy.
- Abstände: p-Wrapper mit padding-bottom 14px. Danach der Button.
- Im Nachbau wird das Formular um Personenanzahl, Hund und Kontaktdaten erweitert. Diese Felder im selben Stil gestalten.

### AvailabilityCalendar

- 6 Monate auf 478px (3 × 2 Monate à 159px; mobil 1 Spalte à 300px, 6 untereinander).
- Kopfleiste: `#363636`, Text weiß, 12.6px, Höhe 26.5px, links „‹zurück“, Mitte „heute“, rechts „vor›“ (Links `#7b7b7b`, „vor“ weiß).
- Monatskopf: `#f2f2f2`, `#363636`, 12.6px (im ersten Monat Dropdowns Monat/Jahr).
- Wochentage (Mo–So): 10.08px 700 `#acacac`, weiß.
- Zellen: 24×27px, Rahmen 1px weiß, Ziffern 12.6px.
  - frei: Hintergrund `#c1eed1`, Ziffer `#363636`
  - belegt: Hintergrund `#f8cccc`, Ziffer `#cccccc`
  - Anreisetag einer Belegung: diagonal geteilt, links oben frei, rechts unten belegt: `linear-gradient(to right bottom, #c1eed1 50%, #f8cccc 50%)`
  - Abreisetag: umgekehrt: `linear-gradient(to left top, #c1eed1 50%, #f8cccc 50%)`
  - Vergangenheit: weiß, Ziffer `#acacac`
- Monatsrahmen rechts `1px solid #e3e3e3`.

### PriceBox

- Hintergrund `rgba(201,177,98,.17)`, Radius 26px, padding 9.6px, Schatten `--shadow-box`.
- Icon links (32px, Farbe `rgba(201,154,0,.92)`, Info-Kreis), Text-Spalte ab 56px.
- Titel H4 18px 700 #333. Inhalt: ein fetter Absatz mit Zeilenumbrüchen: Preis/Nacht für Basis-Personen, Preis je weitere Person, Hundepauschale, Mindestaufenthalt, Hinweis auf abweichende Preise. → Im Nachbau aus den Preisdaten generieren (aktuelle Saison).

### FeatureList („Details …“-Box)

- Hintergrund `rgba(142,114,0,.18)`, Radius 32px, padding 9.6px 14.3px, Schatten `--shadow-box`.
- H3 „Details {Name}“ 22px 400 #333, darunter kursiv „(52 m², bis 4 Personen)“.
- Danach je Gruppe ein Absatz: **Gruppenname:** (700) gefolgt von Einträgen, getrennt mit „ · “. Gruppen: Küche & Geräte, (Bad), Wohnen & Schlafen, Inklusive-Leistungen, Außenbereich, Infrastruktur & Sonstiges. Absätze mit padding-bottom 14px.

### Gallery

- Unterkunft: 2 Spalten à 211px in der 478px-Spalte (Lücke ≈ 55.7px), Bilder im Hochformat 211×282 (3:4, `object-fit: cover`), Radius 24px, `overflow: hidden`, margin-bottom 55.7px. Mobil 1 Spalte (300px).
- Ausflugstipps: 4 Spalten à 230px, Lücke 30.4px, Format 400:284, Radius 24px.
- Hover-Overlay: `rgba(255,255,255,.9)` mit Lupen-/Plus-Icon in der Mitte (Divi-Standard), Fade.
- Bilder lazy laden, `loading="lazy"`.

### Lightbox

- Klick öffnet das Bild groß (Live: Magnific-Popup-Stil): dunkler Hintergrund ca. `rgba(11,11,11,.8)`, Bild zentriert mit max. 90vh, Pfeile links/rechts, Schließen-× oben rechts, Zähler „1 von 10“. Tastatur ←/→/Esc. (Nicht im Detail gemessen, hier die übliche Darstellung.)

### ContactBlock

- Footer-Variante: H3 Montez + 4 Zeilen (Adresse 2 Zeilen, Telefon, E-Mail-Link), Farbe `#333`, 14px / 23.8px.
- Seiten-Variante (Kontakt): H1 Montez 30px, Zeilen mit Präfix „Tel.:“ und „E-Mail:“, Farbe `#666`.

### FAQ / Accordion

```css
.faq__item {
  border: 1px solid #d9d9d9;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 27.8px;
  background: rgba(109, 93, 0, 0.15);
}
.faq__item[open] {
  background: #fff;
}
.faq__title {
  font: 600 16px/1 'Open Sans';
  color: #474747;
  padding-right: 50px;
  position: relative;
}
.faq__item[open] .faq__title {
  color: #000;
}
.faq__icon {
  position: absolute;
  right: -3px;
  top: 50%;
  translate: 0 -50%;
  font-size: 22px;
  color: #8e8b7d;
} /* Plus-Kreis bzw. Minus-Kreis */
.faq__content {
  padding-top: 20px;
  font-size: 14px;
  color: #666;
}
.faq__content a {
  color: #513e00;
  font-weight: 700;
  text-decoration: none;
}
```

Nur ein Element ist offen (Akkordeon). Mit `<details>`/`<summary>` umsetzbar.

### WaveDivider

- Siehe Footer: 40px hoch, `preserveAspectRatio="none"`, Füllung = Farbe der Section darüber (weiß), sitzt oben in der Footer-Section.

### Icons (ETmodules/FontAwesome → frei)

| Live                               | Verwendung                                  | Ersatz (lucide)                                |
| ---------------------------------- | ------------------------------------------- | ---------------------------------------------- |
| ETmodules „3“                      | Chevron am Menüpunkt mit Untermenü          | `chevron-down` (16px)                          |
| ETmodules „a“                      | Hamburger                                   | `menu` (32px, #755b00)                         |
| ETmodules Plus-Kreis / Minus-Kreis | FAQ zu/auf                                  | `circle-plus` / `circle-minus` (22px, #8e8b7d) |
| FontAwesome f05a                   | Preisbox                                    | `info` (32px, rgba(201,154,0,.92))             |
| ETmodules „$“                      | Ausflugstipps-Blurbs (praktisch unsichtbar) | `map-pin` (optional weglassen)                 |
| Galerie-Overlay                    | Hover                                       | `zoom-in` / `plus`                             |

---

## 6. Bilddateien (Zuordnung für Import/Web)

| Stelle                            | Datei (unter `wp-content/uploads/`)                                                                                                     |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Logo                              | `2025/06/haus-anna-bodenmais.png` (live defekt, 0×0)                                                                                    |
| Hero Startseite                   | `2025/06/home_header.jpg`                                                                                                               |
| Teaser Apt 5 / Apt 6              | `2026/04/appartment-5_003.jpg`, `2026/04/appartment-6_002.jpg`                                                                          |
| Teaser FeWo 2 / 3 / 4             | `2026/04/ferienwohnung2.jpg`, `2026/04/ferienwohnung3.jpg`, `2026/04/ferienwohnung4.jpg`                                                |
| Kontakt-Bild                      | `2025/06/garten_001.jpg`                                                                                                                |
| Ausflugstipps-Galerie (Beispiele) | `2026/08/bodenmais-ortsschild.jpg`, `2026/08/wahrzeichen.jpg`, `2026/08/risslochfaelle-bodenmais.jpg` (+5 weitere, live als `-400x284`) |
| Galerien Unterkünfte              | siehe 4.2 bzw. Galerie-Shortcode/`mphb_gallery` im Import                                                                               |

## 7. Nicht gemessen / offen

- Tablet-Layout (768–980px): nur Divi-Standard angenommen.
- Hover-Farben von Menü, Buttons und Links (Divi-Standard: Opacity 0.7 bei Menülinks).
- Genaue Lightbox-Gestaltung.
- Hero-Text war in den Screenshots teils noch nicht eingeblendet (Animation). Die Werte stammen aus dem DOM.
- Datenschutz- und AGB-Seiten nicht einzeln geprüft (gleiches Layout wie Impressum angenommen).
