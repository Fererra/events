import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout, useAuthStore, useIsAuthed, useRole } from '../features/auth';
import { ConfirmDialog } from '../shared/components/ConfirmDialog';
import { MapPinIcon, OrganizerIcon, ShieldIcon, TicketIcon } from '../shared/components/Icons';

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#1f5fd1" />
      <rect x="6" y="9" width="20" height="17" rx="3" fill="#fff" />
      <rect x="6" y="9" width="20" height="5" rx="2" fill="#a9c6f5" />
      <circle cx="16" cy="20" r="2.5" fill="#1f5fd1" />
    </svg>
  );
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const authed = useIsAuthed();
  const role = useRole();
  const profileTitle = useAuthStore(
    (s) => [s.user?.name, s.user?.surname].filter(Boolean).join(' ') || s.user?.email,
  );

  useEffect(() => setOpen(false), [pathname]);

  const closeLogoutDialog = useCallback(() => {
    if (signingOut) return;
    setConfirmLogoutOpen(false);
  }, [signingOut]);

  const handleConfirmLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
      setConfirmLogoutOpen(false);
      navigate('/');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="shell">
      <header className="header">
        <div className="container header__bar">
          <Link to="/" className="brand">
            <Logo />
            <span>Event Service</span>
          </Link>
          <button
            type="button"
            className="burger"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="main-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
          <nav id="main-nav" className={`nav${open ? ' nav--open' : ''}`}>
            <NavLink to="/events">
              <TicketIcon size={17} />
              <span>Events</span>
            </NavLink>
            <NavLink to="/venues">
              <MapPinIcon size={17} />
              <span>Venues</span>
            </NavLink>
            {role === 'admin' && (
              <NavLink to="/admin">
                <ShieldIcon size={17} />
                <span>Admin</span>
              </NavLink>
            )}
            <span className="nav__spacer" />
            {authed ? (
              <>
                <NavLink to="/profile" title={profileTitle}>
                  <OrganizerIcon size={17} />
                  <span>Profile</span>
                </NavLink>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    setOpen(false);
                    setConfirmLogoutOpen(true);
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login">Sign in</NavLink>
                <Link to="/register" className="btn">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="container main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container">Event Service · Igor Sikorsky Kyiv Polytechnic Institute</div>
      </footer>
      <ConfirmDialog
        open={confirmLogoutOpen}
        title="Sign out?"
        description="Are you sure you want to sign out of your account?"
        confirmLabel={signingOut ? 'Signing out…' : 'Sign out'}
        cancelLabel="Stay signed in"
        busy={signingOut}
        onConfirm={handleConfirmLogout}
        onCancel={closeLogoutDialog}
      />
    </div>
  );
}
