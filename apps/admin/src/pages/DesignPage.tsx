import { useEffect, useState } from 'react';
import {
  type DesignSettings,
  FONT_OPTIONS,
  type SiteSettings,
  siteSettingsSchema,
} from '@hausanna/shared';
import { Api } from '../api/endpoints.ts';
import { ImageField } from '../components/MediaPicker.tsx';
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Loading,
  NumberField,
  PageHeader,
  SelectField,
  TextField,
  useAction,
  useFeedback,
} from '../components/ui.tsx';

const COLOR_LABELS: Record<keyof DesignSettings['colors'], { label: string; hint: string }> = {
  text: { label: 'Fließtext', hint: 'Normale Textfarbe' },
  heading: { label: 'Überschriften', hint: 'z. B. Zwischenüberschriften' },
  nav: { label: 'Menü', hint: 'Menüeinträge' },
  navActive: { label: 'Menü aktiv', hint: 'Aktueller Menüpunkt, Hover' },
  accent: { label: 'Akzent / Buttons', hint: 'Buttons, Links' },
  accentDark: { label: 'Akzent dunkel', hint: 'Hover von Buttons' },
  background: { label: 'Hintergrund', hint: 'Seitenhintergrund' },
  footerBackground: { label: 'Footer-Hintergrund', hint: 'Unterer Bereich' },
  footerText: { label: 'Footer-Text', hint: 'Text im Footer' },
};

function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <Field label={label} hint={hint} error={valid ? null : 'Format #RRGGBB'}>
      {(id) => (
        <div className="color-input">
          <input
            type="color"
            aria-label={`${label} wählen`}
            value={valid ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            id={id}
            className="input mono"
            value={value}
            maxLength={7}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )}
    </Field>
  );
}

function Preview({ s }: { s: SiteSettings }) {
  const c = s.design.colors;
  const f = s.design.fonts;
  const body = `'${f.body}', sans-serif`;
  return (
    <div
      className="preview"
      style={{ background: c.background, color: c.text, fontFamily: body, fontSize: f.baseSizePx }}
    >
      <div className="preview-nav">
        {s.design.logo ? (
          <img src={s.design.logo.url} alt="" style={{ height: 36 }} />
        ) : (
          <strong style={{ color: c.accent }}>Haus Anna</strong>
        )}
        <span style={{ color: c.navActive, fontWeight: 600 }}>Startseite</span>
        <span style={{ color: c.nav, fontWeight: 600 }}>Wohnungen</span>
        <span style={{ color: c.nav, fontWeight: 600 }}>Kontakt</span>
      </div>
      <div
        className="preview-hero"
        style={
          s.design.headerImage
            ? {
                backgroundImage: `linear-gradient(rgb(0 0 0 / 35%), rgb(0 0 0 / 35%)), url(${s.design.headerImage.url})`,
              }
            : undefined
        }
      >
        <div style={{ fontFamily: `'${f.script}', cursive`, fontSize: '1.9em' }}>
          Ferienhaus Anna in Bodenmais
        </div>
      </div>
      <div className="preview-body">
        <div style={{ color: c.heading, fontSize: '1.4em', fontWeight: 500 }}>Ferienwohnung 2</div>
        <p>
          So sieht normaler Text auf der Webseite aus. <a style={{ color: c.accent }}>Ein Link</a>.
        </p>
        <span className="preview-btn" style={{ background: c.accent }}>
          Jetzt buchen
        </span>
      </div>
      <div className="preview-foot" style={{ background: c.footerBackground, color: c.footerText }}>
        {s.info.contact.street}, {s.info.contact.zip} {s.info.contact.city} · {s.info.contact.phone}
      </div>
    </div>
  );
}

export function DesignPage() {
  const [s, setS] = useState<SiteSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { busy, run } = useAction();
  const { toast } = useFeedback();

  useEffect(() => {
    Api.settings()
      .then(setS)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!s) return <Loading />;

  const setColor = (k: keyof DesignSettings['colors'], v: string) =>
    setS({ ...s, design: { ...s.design, colors: { ...s.design.colors, [k]: v } } });
  const setDesign = (patch: Partial<DesignSettings>) =>
    setS({ ...s, design: { ...s.design, ...patch } });
  const setInfo = (patch: Partial<SiteSettings['info']>) =>
    setS({ ...s, info: { ...s.info, ...patch } });
  const setContact = (patch: Partial<SiteSettings['info']['contact']>) =>
    setInfo({ contact: { ...s.info.contact, ...patch } });

  const save = async () => {
    const parsed = siteSettingsSchema.safeParse(s);
    if (!parsed.success) {
      toast(
        parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · '),
        'error',
      );
      return;
    }
    const saved = await run(
      () => Api.saveSettings(parsed.data),
      'Design gespeichert – die Webseite zeigt es in wenigen Sekunden',
    );
    if (saved) setS(saved);
  };

  return (
    <div className="stack">
      <PageHeader
        title="Design"
        intro="Farben, Schriften, Logo und Stammdaten der Webseite. Rechts siehst du eine Vorschau."
      />
      <div className="grid-new">
        <div className="stack">
          <Card title="Farben">
            <div className="grid-3">
              {(Object.keys(COLOR_LABELS) as (keyof DesignSettings['colors'])[]).map((k) => (
                <ColorField
                  key={k}
                  label={COLOR_LABELS[k].label}
                  hint={COLOR_LABELS[k].hint}
                  value={s.design.colors[k]}
                  onChange={(v) => setColor(k, v)}
                />
              ))}
            </div>
          </Card>
          <Card title="Schriften">
            <div className="grid-3">
              <SelectField
                label="Fließtext"
                value={s.design.fonts.body}
                onChange={(v) => setDesign({ fonts: { ...s.design.fonts, body: v } })}
                options={FONT_OPTIONS.body.map((f) => ({ value: f, label: f }))}
              />
              <SelectField
                label="Zierschrift (Überschriften)"
                value={s.design.fonts.script}
                onChange={(v) => setDesign({ fonts: { ...s.design.fonts, script: v } })}
                options={FONT_OPTIONS.script.map((f) => ({ value: f, label: f }))}
              />
              <NumberField
                label="Grundgröße (px)"
                value={s.design.fonts.baseSizePx}
                min={12}
                onChange={(v) =>
                  setDesign({
                    fonts: { ...s.design.fonts, baseSizePx: Math.min(20, Math.max(12, v ?? 14)) },
                  })
                }
              />
            </div>
          </Card>
          <Card title="Bilder">
            <div className="grid-3">
              <ImageField
                label="Logo"
                value={s.design.logo}
                onChange={(v) => setDesign({ logo: v })}
              />
              <ImageField
                label="Kopfbild (Startseite)"
                value={s.design.headerImage}
                onChange={(v) => setDesign({ headerImage: v })}
              />
              <ImageField
                label="Favicon (Tab-Symbol)"
                value={s.design.favicon}
                onChange={(v) => setDesign({ favicon: v })}
              />
            </div>
          </Card>
          <Card title="Stammdaten">
            <div className="grid-2">
              <TextField
                label="Seitentitel"
                value={s.info.siteTitle}
                onChange={(v) => setInfo({ siteTitle: v })}
              />
              <TextField
                label="Copyright-Zeile"
                value={s.info.copyright}
                onChange={(v) => setInfo({ copyright: v })}
              />
              <TextField
                label="Name"
                value={s.info.contact.name}
                onChange={(v) => setContact({ name: v })}
              />
              <TextField
                label="Straße"
                value={s.info.contact.street}
                onChange={(v) => setContact({ street: v })}
              />
              <TextField
                label="PLZ"
                value={s.info.contact.zip}
                onChange={(v) => setContact({ zip: v })}
              />
              <TextField
                label="Ort"
                value={s.info.contact.city}
                onChange={(v) => setContact({ city: v })}
              />
              <TextField
                label="Telefon"
                value={s.info.contact.phone}
                onChange={(v) => setContact({ phone: v })}
              />
              <TextField
                label="E-Mail"
                type="email"
                value={s.info.contact.email}
                onChange={(v) => setContact({ email: v })}
              />
              <TextField
                label="Check-in ab"
                type="time"
                value={s.info.checkInFrom}
                onChange={(v) => setInfo({ checkInFrom: v })}
              />
              <TextField
                label="Check-out bis"
                type="time"
                value={s.info.checkOutUntil}
                onChange={(v) => setInfo({ checkOutUntil: v })}
              />
            </div>
          </Card>
          <div className="sticky-actions form-actions">
            <Button variant="primary" busy={busy} onClick={() => void save()}>
              Design speichern
            </Button>
          </div>
        </div>
        <div style={{ position: 'sticky', top: 80 }}>
          <Card title="Vorschau">
            <Preview s={s} />
          </Card>
        </div>
      </div>
    </div>
  );
}
