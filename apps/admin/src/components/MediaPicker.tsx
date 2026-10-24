import { useMemo, useState } from 'react';
import type { Image, MediaItem } from '@hausanna/shared';
import { Api } from '../api/endpoints.ts';
import { useApi } from '../lib/useApi.ts';
import { Button, Dialog, EmptyState, ErrorBox, Loading, useAction } from './ui.tsx';

/** Auswahl-Dialog aus der Mediathek (mit Upload). */
export function MediaPickerDialog({
  open,
  onClose,
  onPick,
  multiple,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (images: Image[]) => void;
  multiple?: boolean;
}) {
  const { data, error, loading, reload } = useApi(
    () => (open ? Api.media() : Promise.resolve([] as MediaItem[])),
    [open],
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const { busy, run } = useAction();

  const items = useMemo(
    () =>
      (data ?? []).filter(
        (m) =>
          !filter ||
          `${m.filename} ${m.alt} ${m.folder}`.toLowerCase().includes(filter.toLowerCase()),
      ),
    [data, filter],
  );

  const toggle = (id: string) =>
    setSelected((s) =>
      multiple ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : [id],
    );

  const confirm = () => {
    const byId = new Map((data ?? []).map((m) => [m.id, m]));
    onPick(
      selected
        .map((id) => byId.get(id)!)
        .filter(Boolean)
        .map((m) => ({ url: m.url, alt: m.alt })),
    );
    setSelected([]);
    onClose();
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    await run(async () => {
      for (const f of Array.from(files)) await Api.uploadMedia(f);
    }, 'Hochgeladen');
    await reload();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={multiple ? 'Bilder auswählen' : 'Bild auswählen'}
      wide
      footer={
        <>
          <span className="muted small" style={{ marginRight: 'auto' }}>
            {selected.length} ausgewählt
          </span>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" disabled={!selected.length} onClick={confirm}>
            Übernehmen
          </Button>
        </>
      }
    >
      <div className="row">
        <input
          className="input"
          style={{ flex: 1, minWidth: 180 }}
          placeholder="Suchen (Dateiname, Ordner) …"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <label className="btn" aria-busy={busy}>
          Hochladen
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => void upload(e.target.files)}
          />
        </label>
      </div>
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState title="Keine Bilder gefunden" hint="Lade über „Hochladen“ ein Bild hoch." />
      ) : null}
      <div className="media-grid">
        {items.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`media-tile ${selected.includes(m.id) ? 'selected' : ''}`}
            onClick={() => toggle(m.id)}
            aria-pressed={selected.includes(m.id)}
          >
            <img src={m.url} alt={m.alt} loading="lazy" />
            <span className="media-meta" title={m.filename}>
              {m.filename}
            </span>
          </button>
        ))}
      </div>
    </Dialog>
  );
}

/** Ein einzelnes Bild wählen/entfernen. */
export function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Image | null;
  onChange: (img: Image | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="field">
      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</span>
      <div className="row">
        {value ? (
          <div className="thumb">
            <img src={value.url} alt={value.alt} />
          </div>
        ) : (
          <span className="muted small">Kein Bild gewählt</span>
        )}
        <div className="stack-sm">
          <Button size="sm" onClick={() => setOpen(true)}>
            {value ? 'Ändern' : 'Bild wählen'}
          </Button>
          {value ? (
            <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
              Entfernen
            </Button>
          ) : null}
        </div>
      </div>
      <MediaPickerDialog
        open={open}
        onClose={() => setOpen(false)}
        onPick={(imgs) => onChange(imgs[0] ?? null)}
      />
    </div>
  );
}

/** Bilderliste: hinzufügen, sortieren, entfernen, optional Titelbild markieren. */
export function ImageListField({
  label,
  value,
  onChange,
  cover,
  onCoverChange,
}: {
  label: string;
  value: Image[];
  onChange: (imgs: Image[]) => void;
  cover?: Image | null;
  onCoverChange?: (img: Image) => void;
}) {
  const [open, setOpen] = useState(false);
  const move = (i: number, d: number) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x!);
    onChange(next);
  };
  return (
    <div className="field">
      <div className="row-between">
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
          {label} <span className="muted">({value.length})</span>
        </span>
        <Button size="sm" onClick={() => setOpen(true)}>
          + Bilder hinzufügen
        </Button>
      </div>
      {value.length === 0 ? <p className="muted small">Noch keine Bilder.</p> : null}
      <div className="thumbs">
        {value.map((img, i) => (
          <div className="thumb" key={`${img.url}-${i}`}>
            <img src={img.url} alt={img.alt} loading="lazy" />
            {cover?.url === img.url ? (
              <span className="cover-badge badge badge-accent">Titelbild</span>
            ) : null}
            <div className="thumb-actions">
              <button
                type="button"
                aria-label="Nach vorne"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                ←
              </button>
              {onCoverChange ? (
                <button type="button" title="Als Titelbild" onClick={() => onCoverChange(img)}>
                  ★
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Nach hinten"
                disabled={i === value.length - 1}
                onClick={() => move(i, 1)}
              >
                →
              </button>
              <button
                type="button"
                aria-label="Entfernen"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
      <MediaPickerDialog
        open={open}
        multiple
        onClose={() => setOpen(false)}
        onPick={(imgs) => onChange([...value, ...imgs])}
      />
    </div>
  );
}
