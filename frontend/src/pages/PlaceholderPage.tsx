export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section>
      <h1>{title}</h1>
      <div className="card">
        <p className="muted">This section is coming soon.</p>
      </div>
    </section>
  );
}
