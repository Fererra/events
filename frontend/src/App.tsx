import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/guards';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { NotFound } from './pages/NotFound';
import { Placeholder } from './pages/Placeholder';
import { Profile } from './pages/Profile';
import { Register } from './pages/Register';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="events" element={<Placeholder title="Events" />} />
        <Route path="venues" element={<Placeholder title="Venues" />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route element={<RequireAuth />}>
          <Route path="profile" element={<Profile />} />
        </Route>
        {/* for future tasks: <Route element={<RequireAuth role="admin" />}>…</Route> */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
