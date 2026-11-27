import { Link } from 'react-router-dom';
import { useRole } from '../../auth';
import { AdminArt, AnalyticsArt, EventsArt, VenuesArt } from '../components/Illustrations';

export function HomePage() {
  const role = useRole();

  return (
    <section>
      <div className="hero">
        <h1>Find events and register in a minute</h1>
        <p className="lead">
          Browse events and venues, choose your ticket type, and manage your registrations in one
          place.
        </p>
      </div>
      <div className="tiles">
        <Link to="/events" className="tile">
          <EventsArt />
          <span className="tile__label">Browse events</span>
        </Link>
        <Link to="/venues" className="tile">
          <VenuesArt />
          <span className="tile__label">Venues</span>
        </Link>
        {role === 'admin' && (
          <>
            <Link to="/admin" className="tile tile--wide">
              <AdminArt />
              <span className="tile__label">Admin panel</span>
            </Link>
            <Link to="/analytics" className="tile tile--wide">
              <AnalyticsArt />
              <span className="tile__label">Analytics</span>
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
