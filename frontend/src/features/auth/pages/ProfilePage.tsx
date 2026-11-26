import { useEffect, useState } from 'react';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import { OrganizerIcon } from '../../../shared/components/Icons';
import { formatDate } from '../../../shared/utils/format';
import { MyRegistrationsSection } from '../../registrations';
import { fetchMe } from '../api/auth.api';
import { useAuthStore, type User } from '../store/auth.store';

function getInitials(user: User): string {
  const first = user.name?.trim().charAt(0) ?? '';
  const last = user.surname?.trim().charAt(0) ?? '';
  const combined = `${first}${last}`.toUpperCase();
  if (combined) return combined;
  return user.email.trim().charAt(0).toUpperCase() || 'U';
}

function getDisplayName(user: User): string {
  const fullName = [user.name?.trim(), user.surname?.trim()].filter(Boolean).join(' ');
  return fullName || user.email;
}

export function ProfilePage() {
  const cached = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [user, setLocal] = useState<User | null>(cached);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchMe(controller.signal)
      .then((u) => {
        setLocal(u);
        setUser(u);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e);
      });
    return () => controller.abort();
  }, [setUser]);

  return (
    <section>
      <div className="page-header">
        <div className="page-header__title">
          <OrganizerIcon size={24} />
          <h1>Profile</h1>
        </div>
        <p className="muted">View your account details and manage your event registrations.</p>
      </div>

      <ErrorMessage error={error} />

      <div className="profile-layout">
        <aside>
          <section className="card profile-card" aria-labelledby="account-details-heading">
            <h2 id="account-details-heading" className="sr-only">
              Account details
            </h2>

            {user ? (
              <>
                <div className="profile-identity">
                  <div className="profile-avatar" aria-hidden="true">
                    {getInitials(user)}
                  </div>
                  <div className="profile-identity__meta">
                    <p className="profile-name">{getDisplayName(user)}</p>
                    <span
                      className={`badge ${user.role === 'admin' ? 'badge--planning' : 'badge--neutral'}`}
                    >
                      {user.role === 'admin' ? 'Administrator' : 'User'}
                    </span>
                  </div>
                </div>

                <dl className="kv profile-kv">
                  <dt>Surname</dt>
                  <dd>{user.surname?.trim() || 'Not specified'}</dd>
                  <dt>Name</dt>
                  <dd>{user.name?.trim() || 'Not specified'}</dd>
                  <dt>Phone</dt>
                  <dd>{user.phone?.trim() || 'Not specified'}</dd>
                  <dt>Email</dt>
                  <dd>{user.email}</dd>
                  <dt>Role</dt>
                  <dd>{user.role === 'admin' ? 'Administrator' : 'User'}</dd>
                  <dt>Member since</dt>
                  <dd>{formatDate(user.createdAt)}</dd>
                </dl>
              </>
            ) : (
              !error && <p className="muted">Loading…</p>
            )}
          </section>
        </aside>

        <MyRegistrationsSection />
      </div>
    </section>
  );
}
