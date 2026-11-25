import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { fieldErrors } from '../api/errors';
import { ErrorMessage } from '../components/ErrorMessage';

export function Login() {
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const fe = fieldErrors(error);

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
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
        <label>
          Email
          <input type="email" autoComplete="email" required value={email} aria-invalid={!!fe.email}
            onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" required value={password} aria-invalid={!!fe.password}
            onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="muted">Don’t have an account? <Link to="/register">Sign up</Link></p>
      </form>
    </section>
  );
}
