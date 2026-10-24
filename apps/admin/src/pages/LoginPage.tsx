import { type FormEvent, useState } from 'react';
import { Button, Card, ErrorBox, TextField } from '../components/ui.tsx';
import { useAuth } from '../auth/AuthContext.tsx';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <Card className="login-card">
        <form className="stack" onSubmit={submit}>
          <div className="stack-sm">
            <h1>Haus Anna</h1>
            <p className="muted">Bitte melde dich an.</p>
          </div>
          {error ? <ErrorBox message={error} /> : null}
          <TextField
            label="E-Mail"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={setEmail}
          />
          <TextField
            label="Passwort"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={setPassword}
          />
          <Button type="submit" variant="primary" busy={busy}>
            Anmelden
          </Button>
        </form>
      </Card>
    </div>
  );
}
