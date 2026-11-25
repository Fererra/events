import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <section>
      <h1>Page not found</h1>
      <p className="muted">Check the address or return to the home page.</p>
      <Link to="/" className="btn">
        Back to home
      </Link>
    </section>
  );
}
