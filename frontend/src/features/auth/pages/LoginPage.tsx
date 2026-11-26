import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login, USE_AUTH_MOCK } from '../api/auth.api';
import { MOCK_DEMO_CREDENTIALS } from '../api/auth.mock';
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

  const onDemoLogin = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(MOCK_DEMO_CREDENTIALS.email, MOCK_DEMO_CREDENTIALS.password);
      navigate(from, { replace: true });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

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
      {USE_AUTH_MOCK && (
        <div className="card demo-box">
          <p className="demo-box__title">Demo account (mock mode)</p>
          <p className="demo-box__creds muted">
            Email: <code>{MOCK_DEMO_CREDENTIALS.email}</code>
            <br />
            Password: <code>{MOCK_DEMO_CREDENTIALS.password}</code>
          </p>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={busy}
            onClick={onDemoLogin}
          >
            Sign in as demo user
          </button>
        </div>
      )}
    </section>
  );
}
