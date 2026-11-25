export function Placeholder({ title }: { title: string }) {
  return (
    <section>
      <h1>{title}</h1>
      <div className="card">
        <p className="muted">This section will be available in upcoming tasks.</p>
      </div>
    </section>
  );
}
