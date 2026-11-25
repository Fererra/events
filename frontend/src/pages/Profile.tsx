import { useEffect, useState } from 'react';
import { fetchMe } from '../api/auth';
import { ErrorMessage } from '../components/ErrorMessage';
import { useAuthStore, type User } from '../store/auth';

export function Profile() {
  const cached = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [user, setLocal] = useState<User | null>(cached);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    fetchMe()
      .then((u) => {
        if (!active) return;
        setLocal(u);
        setUser(u);
      })
      .catch((e) => {
        if (active) setError(e);
      });
    return () => {
      active = false;
    };
  }, [setUser]);

  return (
    <section className="narrow">
      <h1>Profile</h1>
      <ErrorMessage error={error} />
      {user ? (
        <dl className="card kv">
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>Role</dt>
          <dd>{user.role === 'admin' ? 'Administrator' : 'User'}</dd>
          <dt>Registration date</dt>
          <dd>{new Date(user.createdAt).toLocaleDateString('en-US')}</dd>
        </dl>
      ) : (
        !error && <p className="muted">Loading…</p>
      )}
    </section>
  );
}
