import { useState } from 'react';
import { type ExtraInput, extraInputSchema } from '@hausanna/shared';
import { Api } from '../api/endpoints.ts';
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorBox,
  Loading,
  NumberField,
  PageHeader,
  SelectField,
  TextAreaField,
  TextField,
  Toggle,
  useAction,
} from '../components/ui.tsx';
import { euro } from '../lib/labels.ts';
import { useApi } from '../lib/useApi.ts';

const CHARGE = { per_stay: 'einmalig pro Aufenthalt', per_night: 'pro Nacht' } as const;

export function ExtrasPage() {
  const { data, error, loading, reload } = useApi(() => Api.extras());
  const [edit, setEdit] = useState<(ExtraInput & { id?: string }) | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { busy, run } = useAction();

  const save = async () => {
    if (!edit) return;
    const parsed = extraInputSchema.safeParse(edit);
    if (!parsed.success) {
      setFormError(
        parsed.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join(' · '),
      );
      return;
    }
    const ok = await run(
      () => (edit.id ? Api.updateExtra(edit.id, parsed.data) : Api.createExtra(parsed.data)),
      'Gespeichert',
    );
    if (ok) {
      setEdit(null);
      await reload();
    }
  };

  return (
    <div className="stack">
      <PageHeader
        title="Zusatzleistungen"
        intro="Buchbare Extras wie die Hundepauschale. Gäste wählen sie bei der Buchung aus."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setFormError(null);
              setEdit({
                name: '',
                description: '',
                price: 0,
                chargeType: 'per_stay',
                active: true,
              });
            }}
          >
            + Neue Zusatzleistung
          </Button>
        }
      />
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && data.length === 0 ? <EmptyState title="Keine Zusatzleistungen" /> : null}
      {data && data.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="num">Preis</th>
                <th>Berechnung</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.name}</strong>
                    {e.description ? <div className="muted small">{e.description}</div> : null}
                  </td>
                  <td className="num">{euro(e.price)}</td>
                  <td>{CHARGE[e.chargeType]}</td>
                  <td>
                    <Badge tone={e.active ? 'success' : 'neutral'}>
                      {e.active ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      size="sm"
                      onClick={() => {
                        setFormError(null);
                        setEdit({ ...e });
                      }}
                    >
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
        open={edit !== null}
        title={edit?.id ? 'Zusatzleistung bearbeiten' : 'Neue Zusatzleistung'}
        onClose={() => setEdit(null)}
        footer={
          <>
            <Button onClick={() => setEdit(null)}>Abbrechen</Button>
            <Button variant="primary" busy={busy} onClick={() => void save()}>
              Speichern
            </Button>
          </>
        }
      >
        {formError ? <ErrorBox message={formError} /> : null}
        {edit ? (
          <>
            <TextField
              label="Name"
              value={edit.name}
              onChange={(v) => setEdit({ ...edit, name: v })}
            />
            <TextAreaField
              label="Beschreibung"
              value={edit.description}
              onChange={(v) => setEdit({ ...edit, description: v })}
              rows={2}
            />
            <div className="grid-2">
              <NumberField
                label="Preis (€)"
                value={edit.price}
                step={0.01}
                onChange={(v) => setEdit({ ...edit, price: v ?? 0 })}
              />
              <SelectField
                label="Berechnung"
                value={edit.chargeType}
                onChange={(v) => setEdit({ ...edit, chargeType: v })}
                options={[
                  { value: 'per_stay', label: CHARGE.per_stay },
                  { value: 'per_night', label: CHARGE.per_night },
                ]}
              />
            </div>
            <Toggle
              label="Aktiv (auf der Webseite buchbar)"
              checked={edit.active}
              onChange={(v) => setEdit({ ...edit, active: v })}
            />
          </>
        ) : null}
      </Dialog>
    </div>
  );
}
