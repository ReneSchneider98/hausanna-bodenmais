import { useState } from 'react';
import { type SeasonInput, seasonInputSchema } from '@hausanna/shared';
import { Api } from '../api/endpoints.ts';
import {
  Button,
  DangerZone,
  Dialog,
  EmptyState,
  ErrorBox,
  Loading,
  PageHeader,
  TextField,
  useAction,
} from '../components/ui.tsx';
import { formatDate } from '../lib/dates.ts';
import { useApi } from '../lib/useApi.ts';

export function SeasonsPage() {
  const { data, error, loading, reload } = useApi(() => Api.seasons());
  const [edit, setEdit] = useState<(SeasonInput & { id?: string }) | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { busy, run } = useAction();

  const save = async () => {
    if (!edit) return;
    const parsed = seasonInputSchema.safeParse(edit);
    if (!parsed.success) {
      setFormError(parsed.error.issues.map((i) => i.message).join(' · '));
      return;
    }
    const ok = await run(
      () => (edit.id ? Api.updateSeason(edit.id, parsed.data) : Api.createSeason(parsed.data)),
      'Saison gespeichert',
    );
    if (ok) {
      setEdit(null);
      await reload();
    }
  };

  const remove = async (id: string) => {
    const ok = await run(async () => {
      await Api.deleteSeason(id);
      return true;
    }, 'Saison gelöscht');
    if (ok) {
      setEdit(null);
      await reload();
    }
  };

  return (
    <div className="stack">
      <PageHeader
        title="Saisons & Preise"
        intro="Zeiträume mit eigenen Preisen (z. B. Weihnachten). Die Preise je Saison trägst du bei der jeweiligen Unterkunft unter „Preise“ ein."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setFormError(null);
              setEdit({ name: '', startDate: '', endDate: '' });
            }}
          >
            + Neue Saison
          </Button>
        }
      />
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && data.length === 0 ? (
        <EmptyState
          title="Noch keine Saisons"
          hint="Ohne Saisons gilt immer der Grundpreis der Unterkunft."
        />
      ) : null}
      {data && data.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Von</th>
                <th>Bis (letzte Nacht)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                  </td>
                  <td>{formatDate(s.startDate)}</td>
                  <td>{formatDate(s.endDate)}</td>
                  <td className="actions">
                    <Button
                      size="sm"
                      onClick={() => {
                        setFormError(null);
                        setEdit({ ...s });
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
        title={edit?.id ? 'Saison bearbeiten' : 'Neue Saison'}
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
              placeholder="z. B. Weihnachten 2026/27"
              onChange={(v) => setEdit({ ...edit, name: v })}
            />
            <div className="grid-2">
              <TextField
                label="Erste Nacht"
                type="date"
                value={edit.startDate}
                onChange={(v) => setEdit({ ...edit, startDate: v })}
              />
              <TextField
                label="Letzte Nacht"
                type="date"
                value={edit.endDate}
                onChange={(v) => setEdit({ ...edit, endDate: v })}
              />
            </div>
            {edit.id ? (
              <DangerZone
                title="Saison löschen"
                text={`„${edit.name}“ und alle zugehörigen Saisonpreise werden endgültig gelöscht.`}
                label="Saison löschen"
                busy={busy}
                onConfirm={() => remove(edit.id!)}
              />
            ) : null}
          </>
        ) : null}
      </Dialog>
    </div>
  );
}
