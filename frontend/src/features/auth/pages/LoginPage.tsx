import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login } from '../api/auth.api';
import { fieldErrors } from '../../../shared/api/errors';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import { TextField } from '../../../shared/components/TextField';
import { useForm } from '../../../shared/hooks/useForm';
import { validateEmail, validateRequiredPassword } from '../../../shared/utils/validation';

export function LoginPage() {
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/events';
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const serverFields = fieldErrors(error);

  const form = useForm(
    { email: '', password: '' },
    (v) => ({
      email: validateEmail(v.email),
      password: validateRequiredPassword(v.password),
    }),
    () => setError(null),
  );

  const onSubmit = form.submit(async (v) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(v.email.trim(), v.password);
      navigate(from, { replace: true });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  });

  return (
    <section className="narrow">
      <h1>Sign in</h1>
      <form className="card form" onSubmit={onSubmit} noValidate>
        <ErrorMessage error={error} />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          invalid={!!serverFields.email}
          {...form.bind('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          invalid={!!serverFields.password}
          {...form.bind('password')}
        />
        <button className="btn" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="muted">
          New here?{' '}
          <Link to="/register" state={{ from }}>
            Create an account
          </Link>
        </p>
      </form>
    </section>
  );
}
