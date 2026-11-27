export { LoginPage } from './pages/LoginPage';
export { RegisterPage } from './pages/RegisterPage';
export { ProfilePage } from './pages/ProfilePage';
export {
  login,
  register,
  logout,
  fetchMe,
  USE_AUTH_MOCK,
  type RegisterInput,
} from './api/auth.api';
export {
  useAuthStore,
  useIsAuthed,
  useRole,
  getUserDisplayName,
  requireAuthUser,
  requireAdminUser,
  type User,
  type Role,
  type TokenPair,
} from './store/auth.store';
