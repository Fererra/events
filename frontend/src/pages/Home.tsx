import { Link } from 'react-router-dom';

export function Home() {
  return (
    <section className="hero">
      <h1>Find events and register in a minute</h1>
      <p className="lead">
        Browse events and venues, choose your ticket type, and manage your registrations in one place.
      </p>
      <div className="actions">
        <Link to="/events" className="btn">
          Browse events
        </Link>
        <Link to="/venues" className="btn btn--ghost">
          Venues
        </Link>
      </div>
    </section>
  );
}
