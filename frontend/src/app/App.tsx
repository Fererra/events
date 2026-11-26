import { Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import { GuestOnly, RequireAuth } from './guards';
import { LoginPage, ProfilePage, RegisterPage } from '../features/auth';
import { HomePage } from '../features/home';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="events" element={<PlaceholderPage title="Events" />} />
        <Route path="venues" element={<PlaceholderPage title="Venues" />} />
        <Route element={<GuestOnly />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
