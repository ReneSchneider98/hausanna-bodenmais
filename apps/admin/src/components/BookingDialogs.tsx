import { useState } from 'react';
import {
  addDays,
  type Booking,
  createAdminBookingSchema,
  formatEuro,
  type Guest,
  nightsBetween,
} from '@hausanna/shared';
import { Api } from '../api/endpoints.ts';
import { formatDate, formatDateTime } from '../lib/dates.ts';
import { guestName, SOURCE_LABEL, STATUS_LABEL, STATUS_TONE, SYNC_LABEL } from '../lib/labels.ts';
import {
  Badge,
  Button,
  Dialog,
  Drawer,
  ErrorBox,
  NumberField,
  SelectField,
  Tabs,
  TextAreaField,
  TextField,
  useAction,
  useFeedback,
} from './ui.tsx';

type Acc = { id: string; name: string };

const emptyGuest = (): Partial<Guest> => ({ firstName: '', lastName: '', email: '', phone: '' });

interface NewBookingProps {
  open: boolean;
  onClose: () => void;
  onCreated: (b: Booking) => void;
  accommodations: Acc[];
  initial?: { accommodationId?: string; arrival?: string; departure?: string };
}

/** Neue Buchung oder Sperre anlegen (Formular startet bei jedem Öffnen frisch). */
export function NewBookingDialog(props: NewBookingProps) {
  if (!props.open) return null;
  return (
    <NewBookingForm
      {...props}
      key={`${props.initial?.accommodationId}-${props.initial?.arrival}-${props.initial?.departure}`}
    />
  );
}

function NewBookingForm({ open, onClose, onCreated, accommodations, initial }: NewBookingProps) {
  const [kind, setKind] = useState<'admin' | 'blocked'>('admin');
  const [accommodationId, setAccommodationId] = useState(
    initial?.accommodationId || accommodations[0]?.id || '',
  );
  const [arrival, setArrival] = useState(initial?.arrival ?? '');
  const [departure, setDeparture] = useState(
    initial?.departure ?? (initial?.arrival ? addDays(initial.arrival, 1) : ''),
  );
  const [adults, setAdults] = useState<number | null>(2);
  const [children, setChildren] = useState<number | null>(0);
  const [guest, setGuest] = useState<Partial<Guest>>(emptyGuest());
  const [note, setNote] = useState('');
  const [price, setPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { busy, run } = useAction();

  const submit = async () => {
    const parsed = createAdminBookingSchema.safeParse({
      accommodationId,
      arrival,
      departure,
      adults: kind === 'blocked' ? 0 : (adults ?? 0),
      children: kind === 'blocked' ? 0 : (children ?? 0),
      source: kind,
      status: 'confirmed',
      guest: kind === 'blocked' ? null : guest,
      internalNote: note,
      totalPrice: kind === 'blocked' ? null : price,
    });
    if (!parsed.success) {
      setError('Bitte Unterkunft, Anreise und Abreise ausfüllen.');
      return;
    }
    if (departure <= arrival) {
      setError('Die Abreise muss nach der Anreise liegen.');
      return;
    }
    setError(null);
    try {
      const b = await Api.createBooking(parsed.data);
      onCreated(b);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const nights =
    arrival && departure && departure > arrival ? nightsBetween(arrival, departure) : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={kind === 'blocked' ? 'Zeitraum sperren' : 'Neue Buchung'}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" busy={busy} onClick={() => void run(submit)}>
            {kind === 'blocked' ? 'Sperre anlegen' : 'Buchung anlegen'}
          </Button>
        </>
      }
    >
      <Tabs
        value={kind}
        onChange={setKind}
        tabs={[
          { value: 'admin', label: 'Buchung (Gast)' },
          { value: 'blocked', label: 'Sperre (ohne Gast)' },
        ]}
      />
      {error ? <ErrorBox message={error} /> : null}
      <SelectField
        label="Unterkunft"
        value={accommodationId}
        onChange={setAccommodationId}
        options={accommodations.map((a) => ({ value: a.id, label: a.name }))}
      />
      <div className="grid-2">
        <TextField label="Anreise" type="date" value={arrival} onChange={setArrival} />
        <TextField
          label="Abreise"
          type="date"
          value={departure}
          onChange={setDeparture}
          hint={nights ? `${nights} ${nights === 1 ? 'Nacht' : 'Nächte'}` : undefined}
        />
      </div>
      {kind === 'admin' ? (
        <>
          <div className="grid-2">
            <TextField
              label="Vorname"
              value={guest.firstName}
              onChange={(v) => setGuest({ ...guest, firstName: v })}
            />
            <TextField
              label="Nachname"
              value={guest.lastName}
              onChange={(v) => setGuest({ ...guest, lastName: v })}
            />
            <TextField
              label="E-Mail"
              type="email"
              value={guest.email}
              onChange={(v) => setGuest({ ...guest, email: v })}
            />
            <TextField
              label="Telefon"
              value={guest.phone}
              onChange={(v) => setGuest({ ...guest, phone: v })}
            />
            <NumberField label="Erwachsene" value={adults} onChange={setAdults} min={0} />
            <NumberField label="Kinder" value={children} onChange={setChildren} min={0} />
          </div>
          <NumberField
            label="Preis gesamt (€)"
            value={price}
            onChange={setPrice}
            step={0.01}
            allowEmpty
            hint="Optional"
          />
        </>
      ) : (
        <p className="muted small">
          Eine Sperre blockiert den Zeitraum auf der Webseite und – bei aktivem Kanal – auch bei
          Booking.com/Airbnb.
        </p>
      )}
      <TextAreaField
        label="Interne Notiz"
        value={note}
        onChange={setNote}
        hint="Nur im Admin sichtbar."
        rows={2}
      />
    </Dialog>
  );
}

interface DrawerProps {
  booking: Booking | null;
  accommodations: Acc[];
  onClose: () => void;
  onChanged: (b: Booking) => void;
}

/** Details einer Buchung ansehen, bearbeiten, stornieren. */
export function BookingDrawer(props: DrawerProps) {
  if (!props.booking) return null;
  return (
    <BookingDrawerInner
      {...props}
      booking={props.booking}
      key={`${props.booking.id}-${props.booking.updatedAt}`}
    />
  );
}

function BookingDrawerInner({
  booking,
  accommodations,
  onClose,
  onChanged,
}: DrawerProps & { booking: Booking }) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Booking>(booking);
  const [error, setError] = useState<string | null>(null);
  const { confirm, toast } = useFeedback();
  const { busy, run } = useAction();

  const accName = accommodations.find((a) => a.id === booking.accommodationId)?.name ?? '–';
  const fromPortal = ['booking_com', 'airbnb', 'channel_other'].includes(booking.source);
  const sync = SYNC_LABEL[booking.channelSyncState];

  const save = async () => {
    setError(null);
    try {
      const updated = await Api.updateBooking(booking.id, {
        arrival: form.arrival,
        departure: form.departure,
        adults: form.adults,
        children: form.children,
        guest: form.guest,
        note: form.note,
        internalNote: form.internalNote,
        totalPrice: form.totalPrice,
      });
      toast('Gespeichert');
      setEdit(false);
      onChanged(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const cancel = async () => {
    const ok = await confirm({
      title: booking.source === 'blocked' ? 'Sperre aufheben?' : 'Buchung stornieren?',
      text: (
        <p>
          {accName}, {formatDate(booking.arrival)} – {formatDate(booking.departure)}. Der Zeitraum
          wird wieder frei.
          {fromPortal
            ? ' Achtung: Diese Buchung kam über ein Portal – bitte dort ebenfalls stornieren.'
            : ''}
        </p>
      ),
      confirmLabel: booking.source === 'blocked' ? 'Sperre aufheben' : 'Stornieren',
      danger: true,
    });
    if (!ok) return;
    const updated = await run(
      () => Api.updateBooking(booking.id, { status: 'cancelled' }),
      booking.source === 'blocked' ? 'Sperre aufgehoben' : 'Buchung storniert',
    );
    if (updated) onChanged(updated);
  };

  const g = form.guest ?? {};
  const setG = (k: keyof Guest, v: string) => setForm({ ...form, guest: { ...g, [k]: v } });

  return (
    <Drawer
      open
      title={booking.source === 'blocked' ? 'Sperre' : `Buchung ${booking.reference}`}
      onClose={onClose}
      footer={
        edit ? (
          <>
            <Button
              onClick={() => {
                setForm(booking);
                setEdit(false);
              }}
            >
              Abbrechen
            </Button>
            <Button variant="primary" busy={busy} onClick={() => void run(save)}>
              Speichern
            </Button>
          </>
        ) : (
          <>
            {booking.status !== 'cancelled' ? (
              <Button variant="danger" onClick={() => void cancel()}>
                {booking.source === 'blocked' ? 'Sperre aufheben' : 'Stornieren'}
              </Button>
            ) : null}
            <Button
              variant="primary"
              onClick={() => setEdit(true)}
              disabled={booking.status === 'cancelled'}
            >
              Bearbeiten
            </Button>
          </>
        )
      }
    >
      <div className="row">
        <Badge tone={STATUS_TONE[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
        <Badge tone="accent">{SOURCE_LABEL[booking.source]}</Badge>
        <Badge tone={sync.tone}>{sync.label}</Badge>
      </div>
      {booking.channelSyncError ? (
        <ErrorBox message={`Kanal-Fehler: ${booking.channelSyncError}`} />
      ) : null}
      {error ? <ErrorBox message={error} /> : null}

      {!edit ? (
        <dl className="dl">
          <dt>Unterkunft</dt>
          <dd>{accName}</dd>
          <dt>Zeitraum</dt>
          <dd>
            {formatDate(booking.arrival)} – {formatDate(booking.departure)} (
            {nightsBetween(booking.arrival, booking.departure)} Nächte)
          </dd>
          {booking.source !== 'blocked' ? (
            <>
              <dt>Gast</dt>
              <dd>{guestName(booking.guest, booking.source)}</dd>
              <dt>E-Mail</dt>
              <dd>
                {booking.guest?.email ? (
                  <a href={`mailto:${booking.guest.email}`}>{booking.guest.email}</a>
                ) : (
                  '–'
                )}
              </dd>
              <dt>Telefon</dt>
              <dd>
                {booking.guest?.phone ? (
                  <a href={`tel:${booking.guest.phone}`}>{booking.guest.phone}</a>
                ) : (
                  '–'
                )}
              </dd>
              <dt>Adresse</dt>
              <dd>
                {[
                  booking.guest?.street,
                  [booking.guest?.zip, booking.guest?.city].filter(Boolean).join(' '),
                ]
                  .filter(Boolean)
                  .join(', ') || '–'}
              </dd>
              <dt>Personen</dt>
              <dd>
                {booking.adults} Erwachsene{booking.children ? `, ${booking.children} Kinder` : ''}
              </dd>
              <dt>Preis</dt>
              <dd>{booking.totalPrice != null ? formatEuro(booking.totalPrice) : '–'}</dd>
              <dt>Nachricht Gast</dt>
              <dd style={{ whiteSpace: 'pre-wrap' }}>{booking.note || '–'}</dd>
            </>
          ) : null}
          <dt>Interne Notiz</dt>
          <dd style={{ whiteSpace: 'pre-wrap' }}>{booking.internalNote || '–'}</dd>
          <dt>Buchungsnr.</dt>
          <dd className="mono">{booking.reference}</dd>
          {booking.externalRef ? (
            <>
              <dt>Portal-Referenz</dt>
              <dd className="mono small">{booking.externalRef}</dd>
            </>
          ) : null}
          <dt>Angelegt</dt>
          <dd>{formatDateTime(booking.createdAt)}</dd>
        </dl>
      ) : (
        <div className="stack">
          {fromPortal ? (
            <div className="alert alert-warning">
              Diese Buchung kommt von einem Portal. Änderungen bitte auch dort vornehmen.
            </div>
          ) : null}
          <div className="grid-2">
            <TextField
              label="Anreise"
              type="date"
              value={form.arrival}
              onChange={(v) => setForm({ ...form, arrival: v })}
            />
            <TextField
              label="Abreise"
              type="date"
              value={form.departure}
              onChange={(v) => setForm({ ...form, departure: v })}
            />
          </div>
          {booking.source !== 'blocked' ? (
            <>
              <div className="grid-2">
                <TextField
                  label="Vorname"
                  value={g.firstName}
                  onChange={(v) => setG('firstName', v)}
                />
                <TextField
                  label="Nachname"
                  value={g.lastName}
                  onChange={(v) => setG('lastName', v)}
                />
                <TextField label="E-Mail" value={g.email} onChange={(v) => setG('email', v)} />
                <TextField label="Telefon" value={g.phone} onChange={(v) => setG('phone', v)} />
                <TextField label="Straße" value={g.street} onChange={(v) => setG('street', v)} />
                <TextField
                  label="PLZ / Ort"
                  value={[g.zip, g.city].filter(Boolean).join(' ')}
                  onChange={(v) => {
                    const [zip, ...city] = v.split(' ');
                    setForm({ ...form, guest: { ...g, zip: zip ?? '', city: city.join(' ') } });
                  }}
                />
                <NumberField
                  label="Erwachsene"
                  value={form.adults}
                  onChange={(v) => setForm({ ...form, adults: v ?? 0 })}
                  min={0}
                />
                <NumberField
                  label="Kinder"
                  value={form.children}
                  onChange={(v) => setForm({ ...form, children: v ?? 0 })}
                  min={0}
                />
              </div>
              <NumberField
                label="Preis gesamt (€)"
                value={form.totalPrice}
                step={0.01}
                allowEmpty
                onChange={(v) => setForm({ ...form, totalPrice: v })}
              />
              <TextAreaField
                label="Nachricht des Gastes"
                value={form.note}
                onChange={(v) => setForm({ ...form, note: v })}
                rows={2}
              />
            </>
          ) : null}
          <TextAreaField
            label="Interne Notiz"
            value={form.internalNote}
            onChange={(v) => setForm({ ...form, internalNote: v })}
            rows={2}
          />
        </div>
      )}
    </Drawer>
  );
}
