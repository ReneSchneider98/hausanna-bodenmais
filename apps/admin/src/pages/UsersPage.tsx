import { useState } from 'react';
import {
  createUserSchema,
  ROLE_LABELS,
  type User,
  type UserRole,
  updateUserSchema,
} from '@hausanna/shared';
import { Api } from '../api/endpoints.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import {
  Badge,
  Button,
  Card,
  Dialog,
  ErrorBox,
  Loading,
  PageHeader,
  SelectField,
  TextField,
  Toggle,
  useAction,
} from '../components/ui.tsx';
import { formatDateTime } from '../lib/dates.ts';
import { useApi } from '../lib/useApi.ts';

interface Form {
  id?: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  password: string;
}

const ROLE_OPTIONS = (['admin', 'editor'] as const).map((r) => ({
  value: r,
  label: ROLE_LABELS[r],
}));

export function UsersPage() {
  const { user: me } = useAuth();
  const { data, error, loading, reload } = useApi(() => Api.users());
  const [form, setForm] = useState<Form | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { busy, run } = useAction();

  const save = async () => {
    if (!form) return;
    setFormError(null);
    if (form.id) {
      const parsed = updateUserSchema.safeParse({
        name: form.name,
        role: form.role,
        active: form.active,
        password: form.password || undefined,
      });
      if (!parsed.success)
        return setFormError(parsed.error.issues.map((i) => i.message).join(' · '));
      try {
        await Api.updateUser(form.id, parsed.data);
      } catch (e) {
        return setFormError(e instanceof Error ? e.message : String(e));
      }
    } else {
      const parsed = createUserSchema.safeParse(form);
      if (!parsed.success)
        return setFormError(
          parsed.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join(' · '),
        );
      try {
        await Api.createUser(parsed.data);
      } catch (e) {
        return setFormError(e instanceof Error ? e.message : String(e));
      }
    }
    setForm(null);
    await reload();
  };

  const open = (u?: User) => {
    setFormError(null);
    setForm(
      u
        ? { id: u.id, email: u.email, name: u.name, role: u.role, active: u.active, password: '' }
        : { email: '', name: '', role: 'editor', active: true, password: '' },
    );
  };

  return (
    <div className="stack">
      <PageHeader
        title="Benutzer"
        intro="Wer darf sich im Admin anmelden?"
        actions={
          <Button variant="primary" onClick={() => open()}>
            + Neuer Benutzer
          </Button>
        }
      />
      <Card>
        <dl className="dl">
          <dt>{ROLE_LABELS.admin}</dt>
          <dd>darf alles, auch Benutzer und Kanäle verwalten.</dd>
          <dt>{ROLE_LABELS.editor}</dt>
          <dd>
            darf alles außer Benutzer und Kanäle (Buchungen, Unterkünfte, Inhalte, Design, Medien).
          </dd>
        </dl>
      </Card>
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Rolle</th>
                <th>Status</th>
                <th>Letzte Anmeldung</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>{' '}
                    {u.id === me?.id ? <Badge tone="accent">Du</Badge> : null}
                    <div className="muted small">{u.email}</div>
                  </td>
                  <td>{ROLE_LABELS[u.role]}</td>
                  <td>
                    <Badge tone={u.active ? 'success' : 'neutral'}>
                      {u.active ? 'Aktiv' : 'Gesperrt'}
                    </Badge>
                  </td>
                  <td className="small">{formatDateTime(u.lastLoginAt)}</td>
                  <td>
                    <Button size="sm" onClick={() => open(u)}>
                      Bearbeiten
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <Dialog
        open={form !== null}
        title={form?.id ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}
        onClose={() => setForm(null)}
        footer={
          <>
            <Button onClick={() => setForm(null)}>Abbrechen</Button>
            <Button variant="primary" busy={busy} onClick={() => void run(save)}>
              Speichern
            </Button>
          </>
        }
      >
        {formError ? <ErrorBox message={formError} /> : null}
        {form ? (
          <>
            <TextField
              label="Name"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
            />
            <TextField
              label="E-Mail"
              type="email"
              value={form.email}
              disabled={Boolean(form.id)}
              onChange={(v) => setForm({ ...form, email: v })}
              hint={form.id ? 'Die E-Mail kann nicht geändert werden.' : undefined}
            />
            <SelectField
              label="Rolle"
              value={form.role}
              onChange={(v) => setForm({ ...form, role: v })}
              options={ROLE_OPTIONS}
            />
            <TextField
              label={form.id ? 'Neues Passwort (optional)' : 'Passwort'}
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              hint="Mindestens 10 Zeichen. Bei Änderung werden alle Sitzungen dieses Benutzers beendet."
            />
            {form.id ? (
              <Toggle
                label="Aktiv (darf sich anmelden)"
                checked={form.active}
                onChange={(v) => setForm({ ...form, active: v })}
              />
            ) : null}
          </>
        ) : null}
      </Dialog>
    </div>
  );
}
