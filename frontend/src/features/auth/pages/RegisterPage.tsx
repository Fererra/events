import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { register } from '../api/auth.api';
import { fieldErrors, normalizeError } from '../../../shared/api/errors';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import { TextField } from '../../../shared/components/TextField';
import { useForm } from '../../../shared/hooks/useForm';
import {
  normalizePhone,
  validateEmail,
  validateName,
  validateNewPassword,
  validatePhone,
} from '../../../shared/utils/validation';

export function RegisterPage() {
  const navigate = useNavigate();
  const redirectFrom = (useLocation().state as { from?: string } | null)?.from;
  const from = redirectFrom ?? '/events';
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const serverFields = fieldErrors(error);
  const emailTaken = error !== null && normalizeError(error).code === 'EMAIL_TAKEN';

  const form = useForm(
    { surname: '', name: '', phone: '', email: '', password: '' },
    (v) => ({
      surname: validateName(v.surname, 'surname'),
      name: validateName(v.name, 'name'),
      phone: validatePhone(v.phone),
      email: validateEmail(v.email),
      password: validateNewPassword(v.password),
    }),
    () => setError(null),
  );

  const onSubmit = form.submit(async (v) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await register({
        surname: v.surname.trim(),
        name: v.name.trim(),
        phone: normalizePhone(v.phone),
        email: v.email.trim(),
        password: v.password,
      });
      navigate(from, { replace: true });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  });

  return (
    <section className="narrow narrow--wide">
      <h1>Create an account</h1>
      <form className="card form" onSubmit={onSubmit} noValidate>
        <ErrorMessage error={error} />
        <div className="field-row">
          <TextField
            label="Surname"
            autoComplete="family-name"
            invalid={!!serverFields.surname}
            {...form.bind('surname')}
          />
          <TextField
            label="Name"
            autoComplete="given-name"
            invalid={!!serverFields.name}
            {...form.bind('name')}
          />
        </div>
        <TextField
          label="Phone"
          type="tel"
          autoComplete="tel"
          placeholder="+380501234567"
          invalid={!!serverFields.phone}
          {...form.bind('phone')}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          invalid={!!serverFields.email || emailTaken}
          {...form.bind('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          invalid={!!serverFields.password}
          {...form.bind('password')}
        />
        <button className="btn" disabled={busy}>
          {busy ? 'Creating account…' : 'Sign up'}
        </button>
        <p className="muted">
          Already have an account?{' '}
          <Link to="/login" state={redirectFrom ? { from: redirectFrom } : undefined}>
            Sign in
          </Link>
        </p>
      </form>
    </section>
  );
}
