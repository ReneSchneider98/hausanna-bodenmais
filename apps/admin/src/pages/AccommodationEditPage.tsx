import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  type Accommodation,
  type AccommodationInput,
  accommodationInputSchema,
  type AmenityGroup,
  type Season,
  type SeasonPrice,
} from '@hausanna/shared';
import { Api } from '../api/endpoints.ts';
import { ImageField, ImageListField } from '../components/MediaPicker.tsx';
import { RichText } from '../components/RichText.tsx';
import {
  Button,
  Card,
  ErrorBox,
  Loading,
  NumberField,
  PageHeader,
  SelectField,
  Tabs,
  TextAreaField,
  TextField,
  Toggle,
  useAction,
  useFeedback,
} from '../components/ui.tsx';
import { formatDate } from '../lib/dates.ts';
import { ACC_STATUS } from './AccommodationsPage.tsx';

const EMPTY: AccommodationInput = {
  slug: '',
  name: '',
  menuLabel: '',
  sizeSqm: 30,
  maxGuests: 2,
  beds: '',
  teaser: '',
  descriptionHtml: '',
  amenityGroups: [],
  coverImage: null,
  images: [],
  status: 'draft',
  sortOrder: 10,
  basePricePerNight: 80,
  baseGuests: 2,
  extraGuestPricePerNight: 0,
  minNights: 3,
  petsAllowed: false,
  priceNote: '',
};

function toInput(a: Accommodation): AccommodationInput {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = a;
  return rest;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function AmenityEditor({
  value,
  onChange,
}: {
  value: AmenityGroup[];
  onChange: (v: AmenityGroup[]) => void;
}) {
  const set = (i: number, g: AmenityGroup) => onChange(value.map((x, j) => (j === i ? g : x)));
  return (
    <div className="stack">
      {value.length === 0 ? (
        <p className="muted">Noch keine Ausstattung. Lege z. B. eine Gruppe „Küche & Geräte“ an.</p>
      ) : null}
      {value.map((g, i) => (
        <div className="sub-item" key={i}>
          <div className="row-between">
            <TextField
              label="Gruppe"
              value={g.title}
              onChange={(v) => set(i, { ...g, title: v })}
              className="grow"
            />
            <Button
              size="sm"
              variant="danger"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              Gruppe entfernen
            </Button>
          </div>
          <TextAreaField
            label="Einträge (einer pro Zeile)"
            rows={Math.max(3, g.items.length)}
            value={g.items.join('\n')}
            onChange={(v) => set(i, { ...g, items: v.split('\n') })}
            onBlur={() => set(i, { ...g, items: g.items.map((s) => s.trim()).filter(Boolean) })}
          />
        </div>
      ))}
      <Button size="sm" onClick={() => onChange([...value, { title: '', items: [] }])}>
        + Gruppe hinzufügen
      </Button>
    </div>
  );
}

function SeasonPricesEditor({ accommodation }: { accommodation: Accommodation }) {
  const [seasons, setSeasons] = useState<Season[] | null>(null);
  const [rows, setRows] = useState<Record<string, Partial<SeasonPrice>>>({});
  const [error, setError] = useState<string | null>(null);
  const { busy, run } = useAction();

  useEffect(() => {
    Promise.all([Api.seasons(), Api.seasonPrices(accommodation.id)])
      .then(([s, p]) => {
        setSeasons(s);
        setRows(Object.fromEntries(p.map((x) => [x.seasonId, x])));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [accommodation.id]);

  if (error) return <ErrorBox message={error} />;
  if (!seasons) return <Loading />;
  if (seasons.length === 0)
    return (
      <p className="muted">
        Noch keine Saisons angelegt. <Link to="/unterkuenfte/saisons">Saisons anlegen</Link>
      </p>
    );

  const update = (id: string, patch: Partial<SeasonPrice>) =>
    setRows({ ...rows, [id]: { ...rows[id], seasonId: id, ...patch } });
  const save = () =>
    run(async () => {
      const list: SeasonPrice[] = Object.values(rows)
        .filter((r) => r.pricePerNight != null && r.pricePerNight > 0)
        .map((r) => ({
          seasonId: r.seasonId!,
          pricePerNight: r.pricePerNight!,
          baseGuests: r.baseGuests ?? accommodation.baseGuests,
          extraGuestPricePerNight: r.extraGuestPricePerNight ?? 0,
          minNights: r.minNights ?? null,
        }));
      const saved = await Api.saveSeasonPrices(accommodation.id, list);
      setRows(Object.fromEntries(saved.map((x) => [x.seasonId, x])));
    }, 'Saisonpreise gespeichert');

  return (
    <div className="stack">
      <p className="muted small">
        Leeres Preisfeld = in dieser Saison gilt der Grundpreis ({accommodation.basePricePerNight} €
        für {accommodation.baseGuests} Pers.).
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Saison</th>
              <th>Preis / Nacht (€)</th>
              <th>inkl. Personen</th>
              <th>je weitere Person (€)</th>
              <th>Mindestnächte</th>
            </tr>
          </thead>
          <tbody>
            {seasons.map((s) => {
              const r = rows[s.id] ?? {};
              const num = (v: string) => (v === '' ? undefined : Number(v));
              return (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                    <div className="muted small">
                      {formatDate(s.startDate)} – {formatDate(s.endDate)}
                    </div>
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      min={0}
                      aria-label={`Preis ${s.name}`}
                      value={r.pricePerNight ?? ''}
                      onChange={(e) => update(s.id, { pricePerNight: num(e.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      aria-label={`Personen ${s.name}`}
                      placeholder={String(accommodation.baseGuests)}
                      value={r.baseGuests ?? ''}
                      onChange={(e) => update(s.id, { baseGuests: num(e.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      min={0}
                      aria-label={`Aufpreis ${s.name}`}
                      placeholder="0"
                      value={r.extraGuestPricePerNight ?? ''}
                      onChange={(e) =>
                        update(s.id, { extraGuestPricePerNight: num(e.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      aria-label={`Mindestnächte ${s.name}`}
                      placeholder={String(accommodation.minNights)}
                      value={r.minNights ?? ''}
                      onChange={(e) => update(s.id, { minNights: num(e.target.value) ?? null })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="form-actions">
        <Button variant="primary" busy={busy} onClick={() => void save()}>
          Saisonpreise speichern
        </Button>
      </div>
    </div>
  );
}

const CHECKLIST = [
  'Unterkunft hier anlegen (Name, Größe, Personen, Ausstattung, Fotos, Preise) – Status „Entwurf“',
  'Booking.com Extranet: neuen Zimmertyp bzw. neue Unterkunft anlegen',
  'Airbnb: neues Inserat anlegen',
  'Beds24: neue Unterkunft (Room) anlegen und mit Booking.com-Zimmer und Airbnb-Inserat verknüpfen',
  'Admin → Kanäle: Beds24-Room-ID eintragen und Kanal aktivieren',
  'Test: im Kalender einen Testzeitraum sperren, bei Booking.com/Airbnb prüfen, wieder freigeben',
  'Status auf „Veröffentlicht“ stellen',
];

function NewChecklist() {
  const [done, setDone] = useState<boolean[]>(CHECKLIST.map(() => false));
  return (
    <Card title="Checkliste: neue Unterkunft">
      <ul className="checklist">
        {CHECKLIST.map((c, i) => (
          <li key={c}>
            <label>
              <input
                type="checkbox"
                checked={done[i]}
                onChange={(e) => setDone(done.map((d, j) => (j === i ? e.target.checked : d)))}
              />
              <span
                style={
                  done[i] ? { textDecoration: 'line-through', color: 'var(--muted)' } : undefined
                }
              >
                {i + 1}. {c}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="muted small" style={{ marginTop: 12 }}>
        Zusätzliche Kosten: ca. 0,55 €/Monat bei Beds24.
      </p>
    </Card>
  );
}

type Tab = 'basis' | 'beschreibung' | 'ausstattung' | 'bilder' | 'preise';

export function AccommodationEditPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { toast, confirm } = useFeedback();
  const [acc, setAcc] = useState<Accommodation | null>(null);
  const [form, setForm] = useState<AccommodationInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('basis');
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const { busy, run } = useAction();

  useEffect(() => {
    if (!id) return;
    Api.accommodation(id)
      .then((a) => {
        setAcc(a);
        setForm(toInput(a));
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  const set = <K extends keyof AccommodationInput>(k: K, v: AccommodationInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const parsed = accommodationInputSchema.safeParse({
      ...form,
      amenityGroups: form.amenityGroups
        .map((g) => ({
          title: g.title.trim(),
          items: g.items.map((s) => s.trim()).filter(Boolean),
        }))
        .filter((g) => g.title && g.items.length),
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      toast('Bitte die markierten Felder prüfen.', 'error');
      setTab('basis');
      return;
    }
    setErrors({});
    if (isNew) {
      const created = await run(() => Api.createAccommodation(parsed.data), 'Unterkunft angelegt');
      if (created) navigate(`/unterkuenfte/${created.id}`, { replace: true });
    } else {
      const updated = await run(() => Api.updateAccommodation(id, parsed.data), 'Gespeichert');
      if (updated) {
        setAcc(updated);
        setForm(toInput(updated));
      }
    }
  };

  const archive = async () => {
    if (!id) return;
    const ok = await confirm({
      title: 'Unterkunft archivieren?',
      text: 'Sie verschwindet von der Webseite. Bestehende Buchungen bleiben erhalten. Bitte danach auch bei Beds24, Booking.com und Airbnb deaktivieren.',
      confirmLabel: 'Archivieren',
      danger: true,
    });
    if (!ok) return;
    const updated = await run(
      () => Api.updateAccommodation(id, { status: 'archived' }),
      'Archiviert',
    );
    if (updated) setForm(toInput(updated));
  };

  if (loadError) return <ErrorBox message={loadError} />;
  if (!isNew && !acc) return <Loading />;

  return (
    <div className="stack">
      <PageHeader
        title={isNew ? 'Neue Unterkunft' : form.name || 'Unterkunft'}
        intro={
          isNew ? (
            'Fülle die Grunddaten aus und speichere. Danach kannst du Saisonpreise ergänzen.'
          ) : (
            <>
              Adresse auf der Webseite:{' '}
              <a href={`/${form.slug}/`} target="_blank" rel="noreferrer">
                /{form.slug}/
              </a>
            </>
          )
        }
        actions={
          <>
            <Link className="btn" to="/unterkuenfte">
              ← Zurück
            </Link>
            {!isNew && form.status !== 'archived' ? (
              <Button variant="danger" onClick={() => void archive()}>
                Archivieren
              </Button>
            ) : null}
          </>
        }
      />

      <div className={isNew ? 'grid-new' : ''}>
        <div className="stack">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'basis', label: 'Grunddaten' },
              { value: 'beschreibung', label: 'Beschreibung' },
              { value: 'ausstattung', label: 'Ausstattung' },
              { value: 'bilder', label: 'Bilder' },
              { value: 'preise', label: 'Preise' },
            ]}
          />

          {tab === 'basis' ? (
            <Card>
              <div className="grid-2">
                <TextField
                  label="Name"
                  value={form.name}
                  error={errors.name}
                  onChange={(v) => {
                    set('name', v);
                    if (!slugTouched) set('slug', slugify(`${v} haus anna`));
                  }}
                />
                <TextField
                  label="Adresse (URL)"
                  value={form.slug}
                  error={errors.slug}
                  hint={`Webseite: /${form.slug || '…'}/`}
                  onChange={(v) => {
                    setSlugTouched(true);
                    set('slug', slugify(v));
                  }}
                />
                <TextField
                  label="Untertitel im Menü"
                  value={form.menuLabel}
                  placeholder="z. B. bis 4 Personen"
                  onChange={(v) => set('menuLabel', v)}
                />
                <SelectField
                  label="Status"
                  value={form.status}
                  onChange={(v) => set('status', v)}
                  options={(['draft', 'published', 'archived'] as const).map((s) => ({
                    value: s,
                    label: ACC_STATUS[s].label,
                  }))}
                  hint="Nur „Veröffentlicht“ ist auf der Webseite sichtbar und buchbar."
                />
                <NumberField
                  label="Größe (m²)"
                  value={form.sizeSqm}
                  onChange={(v) => set('sizeSqm', v ?? 0)}
                  error={errors.sizeSqm}
                  min={1}
                />
                <NumberField
                  label="Max. Personen"
                  value={form.maxGuests}
                  onChange={(v) => set('maxGuests', v ?? 1)}
                  error={errors.maxGuests}
                  min={1}
                />
                <TextField
                  label="Betten"
                  value={form.beds}
                  placeholder="z. B. Doppel-Boxspringbett, Schlafsofa"
                  onChange={(v) => set('beds', v)}
                />
                <NumberField
                  label="Reihenfolge"
                  value={form.sortOrder}
                  onChange={(v) => set('sortOrder', v ?? 0)}
                  hint="Kleinere Zahl = weiter vorne im Menü"
                />
              </div>
              <div style={{ marginTop: 16 }}>
                <Toggle
                  label="Haustiere erlaubt"
                  checked={form.petsAllowed}
                  onChange={(v) => set('petsAllowed', v)}
                />
              </div>
            </Card>
          ) : null}

          {tab === 'beschreibung' ? (
            <Card>
              <div className="stack">
                <TextAreaField
                  label="Kurztext (Teaser auf der Startseite)"
                  value={form.teaser}
                  onChange={(v) => set('teaser', v)}
                  rows={3}
                />
                <RichText
                  label="Beschreibung"
                  value={form.descriptionHtml}
                  onChange={(v) => set('descriptionHtml', v)}
                />
              </div>
            </Card>
          ) : null}

          {tab === 'ausstattung' ? (
            <Card title="Ausstattung">
              <AmenityEditor value={form.amenityGroups} onChange={(v) => set('amenityGroups', v)} />
            </Card>
          ) : null}

          {tab === 'bilder' ? (
            <Card>
              <div className="stack">
                <ImageField
                  label="Titelbild"
                  value={form.coverImage}
                  onChange={(v) => set('coverImage', v)}
                />
                <ImageListField
                  label="Galerie"
                  value={form.images}
                  onChange={(v) => set('images', v)}
                  cover={form.coverImage}
                  onCoverChange={(img) => set('coverImage', img)}
                />
              </div>
            </Card>
          ) : null}

          {tab === 'preise' ? (
            <>
              <Card title="Grundpreis">
                <div className="grid-2">
                  <NumberField
                    label="Preis pro Nacht (€)"
                    value={form.basePricePerNight}
                    step={0.01}
                    onChange={(v) => set('basePricePerNight', v ?? 0)}
                    error={errors.basePricePerNight}
                  />
                  <NumberField
                    label="inklusive Personen"
                    value={form.baseGuests}
                    onChange={(v) => set('baseGuests', v ?? 1)}
                    min={1}
                    error={errors.baseGuests}
                  />
                  <NumberField
                    label="je weitere Person / Nacht (€)"
                    value={form.extraGuestPricePerNight}
                    step={0.01}
                    onChange={(v) => set('extraGuestPricePerNight', v ?? 0)}
                  />
                  <NumberField
                    label="Mindestaufenthalt (Nächte)"
                    value={form.minNights}
                    onChange={(v) => set('minNights', v ?? 1)}
                    min={1}
                  />
                </div>
                <div style={{ marginTop: 16 }}>
                  <RichText
                    label="Preishinweis (Text auf der Webseite)"
                    value={form.priceNote}
                    onChange={(v) => set('priceNote', v)}
                  />
                </div>
              </Card>
              <Card title="Saisonpreise">
                {acc ? (
                  <SeasonPricesEditor accommodation={acc} />
                ) : (
                  <p className="muted">
                    Bitte zuerst speichern, dann können Saisonpreise ergänzt werden.
                  </p>
                )}
              </Card>
            </>
          ) : null}

          <div className="sticky-actions form-actions">
            <Button variant="primary" busy={busy} onClick={() => void save()}>
              {isNew ? 'Unterkunft anlegen' : 'Änderungen speichern'}
            </Button>
          </div>
        </div>
        {isNew ? <NewChecklist /> : null}
      </div>
    </div>
  );
}
