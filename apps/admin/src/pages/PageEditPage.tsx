import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { type Page, type PageBlock, type PageBlockType, pageSchema } from '@hausanna/shared';
import { Api } from '../api/endpoints.ts';
import { ImageField, ImageListField } from '../components/MediaPicker.tsx';
import { RichText } from '../components/RichText.tsx';
import {
  Button,
  Card,
  Dialog,
  ErrorBox,
  Loading,
  NumberField,
  PageHeader,
  SelectField,
  TextAreaField,
  TextField,
  Toggle,
  useAction,
  useFeedback,
} from '../components/ui.tsx';
import { publicUrl } from './PagesPage.tsx';

const BLOCK_LABEL: Record<PageBlockType, { label: string; hint: string }> = {
  hero: { label: 'Titelbild mit Text', hint: 'Großes Bild oben mit Überschrift' },
  richText: { label: 'Text', hint: 'Absätze, Überschriften, Listen' },
  accommodationTeasers: {
    label: 'Unterkünfte-Übersicht',
    hint: 'Karten aller veröffentlichten Unterkünfte',
  },
  contact: { label: 'Kontakt', hint: 'Adresse, Telefon, E-Mail' },
  gallery: { label: 'Bildergalerie', hint: 'Mehrere Bilder im Raster' },
  faq: { label: 'Fragen & Antworten', hint: 'Aufklappbare Fragen' },
  cards: { label: 'Karten-Raster', hint: 'z. B. Ausflugstipps mit Bild und Text' },
  imageText: { label: 'Bild mit Text', hint: 'Bild links oder rechts, Text daneben' },
};

function newBlock(type: PageBlockType): PageBlock {
  const id = `${type}-${Date.now().toString(36)}`;
  switch (type) {
    case 'hero':
      return { id, type, heading: 'Überschrift', html: '', image: null };
    case 'richText':
      return { id, type, html: '<p>Text</p>' };
    case 'accommodationTeasers':
      return { id, type, heading: '' };
    case 'contact':
      return { id, type, heading: 'Kontakt' };
    case 'gallery':
      return { id, type, images: [] };
    case 'faq':
      return {
        id,
        type,
        heading: '',
        items: [{ question: 'Frage?', html: '<p>Antwort</p>', open: false }],
      };
    case 'cards':
      return { id, type, heading: '', columns: 3, items: [] };
    case 'imageText':
      return { id, type, heading: '', html: '', image: null, imagePosition: 'left' };
  }
}

function BlockEditor({ block, onChange }: { block: PageBlock; onChange: (b: PageBlock) => void }) {
  switch (block.type) {
    case 'hero':
      return (
        <>
          <TextField
            label="Überschrift"
            value={block.heading}
            onChange={(v) => onChange({ ...block, heading: v })}
          />
          <RichText
            label="Text"
            value={block.html}
            onChange={(v) => onChange({ ...block, html: v })}
          />
          <ImageField
            label="Hintergrundbild"
            value={block.image}
            onChange={(v) => onChange({ ...block, image: v })}
          />
        </>
      );
    case 'richText':
      return (
        <RichText
          label="Text"
          value={block.html}
          onChange={(v) => onChange({ ...block, html: v })}
        />
      );
    case 'accommodationTeasers':
      return (
        <>
          <TextField
            label="Überschrift (optional)"
            value={block.heading}
            onChange={(v) => onChange({ ...block, heading: v })}
          />
          <p className="muted small">Zeigt automatisch alle veröffentlichten Unterkünfte.</p>
        </>
      );
    case 'contact':
      return (
        <>
          <TextField
            label="Überschrift"
            value={block.heading}
            onChange={(v) => onChange({ ...block, heading: v })}
          />
          <p className="muted small">Kontaktdaten kommen aus „Design → Stammdaten“.</p>
        </>
      );
    case 'gallery':
      return (
        <ImageListField
          label="Bilder"
          value={block.images}
          onChange={(v) => onChange({ ...block, images: v })}
        />
      );
    case 'imageText':
      return (
        <>
          <TextField
            label="Überschrift"
            value={block.heading}
            onChange={(v) => onChange({ ...block, heading: v })}
          />
          <RichText
            label="Text"
            value={block.html}
            onChange={(v) => onChange({ ...block, html: v })}
          />
          <ImageField
            label="Bild"
            value={block.image}
            onChange={(v) => onChange({ ...block, image: v })}
          />
          <SelectField
            label="Bildposition"
            value={block.imagePosition}
            onChange={(v) => onChange({ ...block, imagePosition: v })}
            options={[
              { value: 'left', label: 'Links' },
              { value: 'right', label: 'Rechts' },
            ]}
          />
        </>
      );
    case 'faq':
      return (
        <>
          <TextField
            label="Überschrift (optional)"
            value={block.heading}
            onChange={(v) => onChange({ ...block, heading: v })}
          />
          {block.items.map((item, i) => {
            const set = (patch: Partial<typeof item>) =>
              onChange({
                ...block,
                items: block.items.map((x, j) => (j === i ? { ...x, ...patch } : x)),
              });
            return (
              <div className="sub-item" key={i}>
                <TextField
                  label={`Frage ${i + 1}`}
                  value={item.question}
                  onChange={(v) => set({ question: v })}
                />
                <RichText label="Antwort" value={item.html} onChange={(v) => set({ html: v })} />
                <div className="row-between">
                  <Toggle
                    label="Anfangs aufgeklappt"
                    checked={item.open}
                    onChange={(v) => set({ open: v })}
                  />
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      onChange({ ...block, items: block.items.filter((_, j) => j !== i) })
                    }
                  >
                    Frage entfernen
                  </Button>
                </div>
              </div>
            );
          })}
          <Button
            size="sm"
            onClick={() =>
              onChange({
                ...block,
                items: [...block.items, { question: '', html: '', open: false }],
              })
            }
          >
            + Frage hinzufügen
          </Button>
        </>
      );
    case 'cards':
      return (
        <>
          <div className="grid-2">
            <TextField
              label="Überschrift (optional)"
              value={block.heading}
              onChange={(v) => onChange({ ...block, heading: v })}
            />
            <NumberField
              label="Spalten"
              value={block.columns}
              min={1}
              onChange={(v) => onChange({ ...block, columns: Math.min(4, Math.max(1, v ?? 3)) })}
            />
          </div>
          {block.items.map((item, i) => {
            const set = (patch: Partial<typeof item>) =>
              onChange({
                ...block,
                items: block.items.map((x, j) => (j === i ? { ...x, ...patch } : x)),
              });
            return (
              <div className="sub-item" key={i}>
                <div className="row-between">
                  <strong>Karte {i + 1}</strong>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      onChange({ ...block, items: block.items.filter((_, j) => j !== i) })
                    }
                  >
                    Entfernen
                  </Button>
                </div>
                <TextField label="Titel" value={item.title} onChange={(v) => set({ title: v })} />
                <RichText label="Text" value={item.html} onChange={(v) => set({ html: v })} />
                <div className="grid-2">
                  <ImageField label="Bild" value={item.image} onChange={(v) => set({ image: v })} />
                  <TextField
                    label="Link (optional)"
                    value={item.url}
                    onChange={(v) => set({ url: v })}
                  />
                </div>
              </div>
            );
          })}
          <Button
            size="sm"
            onClick={() =>
              onChange({
                ...block,
                items: [...block.items, { title: '', html: '', image: null, url: '' }],
              })
            }
          >
            + Karte hinzufügen
          </Button>
        </>
      );
  }
}

export function PageEditPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<Page | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { busy, run } = useAction();
  const { confirm, toast } = useFeedback();

  useEffect(() => {
    Api.page(slug)
      .then(setPage)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [slug]);

  if (error) return <ErrorBox message={error} />;
  if (!page) return <Loading />;

  const setBlocks = (blocks: PageBlock[]) => setPage({ ...page, blocks });
  const move = (i: number, d: number) => {
    const b = [...page.blocks];
    const [x] = b.splice(i, 1);
    b.splice(i + d, 0, x!);
    setBlocks(b);
  };

  const save = async () => {
    const parsed = pageSchema.safeParse(page);
    if (!parsed.success) {
      toast(
        parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · '),
        'error',
      );
      return;
    }
    const saved = await run(() => Api.savePage(parsed.data), 'Seite gespeichert');
    if (saved) setPage(saved);
  };

  const remove = async () => {
    if (
      !(await confirm({
        title: 'Seite löschen?',
        text: `„${page.title}“ ist danach auf der Webseite nicht mehr erreichbar.`,
        confirmLabel: 'Löschen',
        danger: true,
      }))
    )
      return;
    const ok = await run(async () => {
      await Api.deletePage(page.slug);
      return true;
    }, 'Seite gelöscht');
    if (ok) navigate('/inhalte');
  };

  return (
    <div className="stack">
      <PageHeader
        title={page.title}
        intro={
          <>
            Webseite:{' '}
            <a href={publicUrl(page.slug)} target="_blank" rel="noreferrer">
              {publicUrl(page.slug)} ↗
            </a>
          </>
        }
        actions={
          <>
            <Link className="btn" to="/inhalte">
              ← Zurück
            </Link>
            <a className="btn" href={publicUrl(page.slug)} target="_blank" rel="noreferrer">
              Seite ansehen
            </a>
            {page.slug !== 'home' ? (
              <Button variant="danger" onClick={() => void remove()}>
                Löschen
              </Button>
            ) : null}
          </>
        }
      />
      <Card title="Allgemein">
        <div className="grid-2">
          <TextField
            label="Titel"
            value={page.title}
            onChange={(v) => setPage({ ...page, title: v })}
          />
          <TextField
            label="Titel für Google (optional)"
            value={page.metaTitle}
            onChange={(v) => setPage({ ...page, metaTitle: v })}
          />
          <div className="span-2">
            <TextAreaField
              label="Beschreibung für Google"
              value={page.metaDescription}
              onChange={(v) => setPage({ ...page, metaDescription: v })}
              rows={2}
              hint={`${page.metaDescription.length}/160 Zeichen`}
            />
          </div>
          <Toggle
            label="Im Hauptmenü anzeigen"
            checked={page.showInMenu}
            onChange={(v) => setPage({ ...page, showInMenu: v })}
          />
          <Toggle
            label="Im Footer anzeigen"
            checked={page.showInFooter}
            onChange={(v) => setPage({ ...page, showInFooter: v })}
          />
          <NumberField
            label="Position im Menü"
            value={page.menuOrder}
            onChange={(v) => setPage({ ...page, menuOrder: v ?? 0 })}
            hint="Kleinere Zahl = weiter links"
          />
        </div>
      </Card>

      <div className="row-between">
        <h2>Inhalt ({page.blocks.length} Blöcke)</h2>
        <Button onClick={() => setAdding(true)}>+ Block hinzufügen</Button>
      </div>
      {page.blocks.map((b, i) => (
        <section className="block-card" key={b.id}>
          <header>
            <div>
              <strong>
                {i + 1}. {BLOCK_LABEL[b.type].label}
              </strong>
            </div>
            <div className="row" style={{ gap: 4 }}>
              <Button
                size="sm"
                variant="ghost"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                aria-label="Nach oben"
              >
                ↑
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={i === page.blocks.length - 1}
                onClick={() => move(i, 1)}
                aria-label="Nach unten"
              >
                ↓
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={async () => {
                  if (
                    await confirm({
                      title: 'Block entfernen?',
                      text: `„${BLOCK_LABEL[b.type].label}“ wird beim Speichern entfernt.`,
                      confirmLabel: 'Entfernen',
                      danger: true,
                    })
                  )
                    setBlocks(page.blocks.filter((_, j) => j !== i));
                }}
              >
                Entfernen
              </Button>
            </div>
          </header>
          <div className="block-body">
            <BlockEditor
              block={b}
              onChange={(nb) => setBlocks(page.blocks.map((x, j) => (j === i ? nb : x)))}
            />
          </div>
        </section>
      ))}

      <div className="sticky-actions form-actions">
        <Button variant="primary" busy={busy} onClick={() => void save()}>
          Seite speichern
        </Button>
      </div>

      <Dialog open={adding} title="Block hinzufügen" onClose={() => setAdding(false)}>
        <div className="stack-sm">
          {(Object.keys(BLOCK_LABEL) as PageBlockType[]).map((t) => (
            <button
              key={t}
              type="button"
              className="btn"
              style={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 0,
              }}
              onClick={() => {
                setBlocks([...page.blocks, newBlock(t)]);
                setAdding(false);
              }}
            >
              <span>{BLOCK_LABEL[t].label}</span>
              <span className="muted small" style={{ fontWeight: 400 }}>
                {BLOCK_LABEL[t].hint}
              </span>
            </button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
