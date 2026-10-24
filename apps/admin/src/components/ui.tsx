import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

/* ---------- Button ---------- */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({
  variant = 'secondary',
  size,
  busy,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm'; busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || busy}
      className={`btn btn-${variant}${size ? ` btn-${size}` : ''} ${className}`}
    >
      {busy ? <span className="spinner" aria-hidden /> : null}
      {children}
    </button>
  );
}

/* ---------- Formularfelder ---------- */
export function Field({
  label,
  hint,
  error,
  children,
  className = '',
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: (id: string) => ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`field ${error ? 'field-error' : ''} ${className}`}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {error ? (
        <p className="field-msg error">{error}</p>
      ) : hint ? (
        <p className="field-msg">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  value,
  onChange,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  value: string | number | null | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(id) => (
        <input
          id={id}
          className="input"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          {...rest}
        />
      )}
    </Field>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  error,
  step = 1,
  min,
  allowEmpty,
  className,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  hint?: ReactNode;
  error?: string | null;
  step?: number;
  min?: number;
  allowEmpty?: boolean;
  className?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(id) => (
        <input
          id={id}
          className="input"
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={value ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') onChange(allowEmpty ? null : 0);
            else onChange(Number(raw));
          }}
        />
      )}
    </Field>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  hint,
  rows = 3,
  ...rest
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> & {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
}) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <textarea
          id={id}
          className="input"
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...rest}
        />
      )}
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> & {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: ReactNode;
}) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <select
          id={id}
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="toggle-row">
      <label className="toggle" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-track" aria-hidden>
          <span className="toggle-thumb" />
        </span>
        <span>{label}</span>
      </label>
      {hint ? <p className="field-msg">{hint}</p> : null}
    </div>
  );
}

/* ---------- Layout-Bausteine ---------- */
export function Card({
  title,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title || actions ? (
        <header className="card-head">
          {title ? <h2>{title}</h2> : <span />}
          {actions ? <div className="card-actions">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  intro,
  actions,
}: {
  title: string;
  intro?: ReactNode;
  actions?: ReactNode;
}) {
  // Satzweise umbrechen: Passt nicht alles in eine Zeile, beginnt der nächste Satz neu,
  // statt mitten im Satz zu brechen. Satzende = zwei Kleinbuchstaben/")" + Punkt (nicht "z. B.")
  const sentences = typeof intro === 'string' ? intro.split(/(?<=[a-zäöüß)]{2}\.)\s+/) : null;
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {intro ? (
          <p className="muted page-intro">
            {sentences ? sentences.map((s, i) => <span key={i}>{s}</span>) : intro}
          </p>
        ) : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {hint ? <p className="muted">{hint}</p> : null}
      {action}
    </div>
  );
}

export function Loading({ label = 'Lade …' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden /> {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="alert alert-danger" role="alert">
      <span>{message}</span>
      {onRetry ? (
        <Button size="sm" onClick={onRetry}>
          Erneut versuchen
        </Button>
      ) : null}
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: { value: T; label: string }[];
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={t.value === value}
          className={`tab ${t.value === value ? 'active' : ''}`}
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Dialog & Drawer ---------- */
function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);
}

export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEscape(open, onClose);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`dialog ${wide ? 'dialog-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
      >
        <header className="dialog-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Schließen" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="dialog-body">{children}</div>
        {footer ? <footer className="dialog-foot">{footer}</footer> : null}
      </div>
    </div>
  );
}

export function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div
      className="overlay overlay-drawer"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <header className="dialog-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Schließen" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="dialog-body">{children}</div>
        {footer ? <footer className="dialog-foot">{footer}</footer> : null}
      </aside>
    </div>
  );
}

/* ---------- Toasts & Bestätigungen ---------- */
interface Toast {
  id: number;
  tone: 'success' | 'error' | 'info';
  text: string;
}
interface ConfirmState {
  title: string;
  text: ReactNode;
  confirmLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}
const FeedbackCtx = createContext<{
  toast: (text: string, tone?: Toast['tone']) => void;
  confirm: (o: {
    title: string;
    text: ReactNode;
    confirmLabel?: string;
    danger?: boolean;
  }) => Promise<boolean>;
} | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const seq = useRef(0);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, tone, text }]);
    setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      tone === 'error' ? 7000 : 3500,
    );
  }, []);

  const confirm = useCallback(
    (o: { title: string; text: ReactNode; confirmLabel?: string; danger?: boolean }) =>
      new Promise<boolean>((resolve) =>
        setConfirmState({
          title: o.title,
          text: o.text,
          confirmLabel: o.confirmLabel ?? 'Bestätigen',
          danger: o.danger ?? false,
          resolve,
        }),
      ),
    [],
  );

  const close = (ok: boolean) => {
    confirmState?.resolve(ok);
    setConfirmState(null);
  };

  return (
    <FeedbackCtx.Provider value={{ toast, confirm }}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.tone}`}
            role={t.tone === 'error' ? 'alert' : 'status'}
          >
            {t.tone === 'success' ? '✓ ' : t.tone === 'error' ? '! ' : ''}
            {t.text}
            <button
              type="button"
              className="icon-btn"
              aria-label="Schließen"
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <Dialog
        open={confirmState !== null}
        title={confirmState?.title ?? ''}
        onClose={() => close(false)}
        footer={
          <>
            <Button onClick={() => close(false)}>Abbrechen</Button>
            <Button
              variant={confirmState?.danger ? 'danger' : 'primary'}
              onClick={() => close(true)}
            >
              {confirmState?.confirmLabel}
            </Button>
          </>
        }
      >
        <div>{confirmState?.text}</div>
      </Dialog>
    </FeedbackCtx.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackCtx);
  if (!ctx) throw new Error('FeedbackProvider fehlt');
  return ctx;
}

/** Führt eine Aktion aus und zeigt Erfolg/Fehler als Toast. */
export function useAction() {
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <T,>(fn: () => Promise<T>, success?: string): Promise<T | undefined> => {
      setBusy(true);
      try {
        const r = await fn();
        if (success) toast(success);
        return r;
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e), 'error');
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  return { busy, run };
}
