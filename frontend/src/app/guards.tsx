import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ApiError } from '../shared/api/errors';
import { ErrorMessage } from '../shared/components/ErrorMessage';
import { useIsAuthed, useRole, type Role } from '../features/auth';

export function RequireAuth({ role }: { role?: Role }) {
  const authed = useIsAuthed();
  const current = useRole();
  const location = useLocation();
  const from = location.pathname + location.search + location.hash;

  if (!authed) return <Navigate to="/login" replace state={{ from }} />;
  if (role === 'admin' && current !== 'admin') {
    return <ErrorMessage error={new ApiError(403, 'FORBIDDEN', 'Forbidden')} />;
  }
  return <Outlet />;
}

export function GuestOnly() {
  const authed = useIsAuthed();
  const from = (useLocation().state as { from?: string } | null)?.from;
  if (authed) return <Navigate to={from ?? '/'} replace />;
  return <Outlet />;
}
