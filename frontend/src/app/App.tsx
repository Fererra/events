import { Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import { GuestOnly, RequireAuth } from './guards';
import { AdminPage } from '../features/admin';
import { LoginPage, ProfilePage, RegisterPage } from '../features/auth';
import { EventDetailsPage, EventsListPage } from '../features/events';
import { HomePage } from '../features/home';
import { VenueDetailsPage, VenuesListPage } from '../features/venues';
import { NotFoundPage } from '../pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="events" element={<EventsListPage />} />
        <Route path="events/:id" element={<EventDetailsPage />} />
        <Route path="venues" element={<VenuesListPage />} />
        <Route path="venues/:id" element={<VenueDetailsPage />} />
        <Route element={<GuestOnly />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route element={<RequireAuth role="admin" />}>
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
