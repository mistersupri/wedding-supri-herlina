import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Button } from '../../components/ui/Button.js';
import { Field, Input } from '../../components/ui/Field.js';
import { KawungMark } from '../../components/ui/Kawung.js';

export const CMSLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/cms/overview';

  if (isAuthenticated) return <Navigate to={from} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="on-deep kawung-field flex min-h-dvh items-center justify-center px-5 py-10">
      <main className="w-full max-w-sm rounded-md bg-card p-7 text-ink">
        <KawungMark className="h-8 w-8 text-prada" />
        <h1 className="mt-4 font-display text-3xl">Masuk ke CMS</h1>
        <p className="mt-1 text-[15px] text-ink-soft">Kelola isi undangan, daftar tamu, dan penerimaan tamu.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Username">
            {(p) => <Input {...p} required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />}
          </Field>
          <Field label="Kata sandi" error={error}>
            {(p) => (
              <Input
                {...p}
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
          <Button type="submit" loading={busy} className="w-full">
            Masuk
          </Button>
        </form>
        <Link to="/" className="mt-5 inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">
          Kembali ke undangan
        </Link>
      </main>
    </div>
  );
};
