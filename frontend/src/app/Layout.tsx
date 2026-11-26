import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout, useAuthStore, useIsAuthed } from '../features/auth';

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
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const authed = useIsAuthed();
  const email = useAuthStore((s) => s.user?.email);

  useEffect(() => setOpen(false), [pathname]);

  const onLogout = async () => {
    await logout();
    navigate('/');
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
            <NavLink to="/events">Events</NavLink>
            <NavLink to="/venues">Venues</NavLink>
            <span className="nav__spacer" />
            {authed ? (
              <>
                <NavLink to="/profile" title={email}>
                  Profile
                </NavLink>
                <button type="button" className="btn btn--ghost" onClick={onLogout}>
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
    </div>
  );
}
