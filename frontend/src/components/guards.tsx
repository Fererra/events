import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ApiError } from '../api/errors';
import { useIsAuthed, useRole, type Role } from '../store/auth';
import { ErrorMessage } from './ErrorMessage';

export function RequireAuth({ role }: { role?: Role }) {
  const authed = useIsAuthed();
  const current = useRole();
  const location = useLocation();

  if (!authed) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role === 'admin' && current !== 'admin') {
    return <ErrorMessage error={new ApiError(403, 'FORBIDDEN', 'Forbidden')} />;
  }
  return <Outlet />;
}
