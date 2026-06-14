import Link from "next/link";

export default function Page() {
  return (
    <main className="container-shell">
      <section className="card" style={{ padding: 22 }}>
        <h1 style={{ marginTop: 0 }}>Audit Logs</h1>
        <p>This placeholder route is included for Phase 1A navigation.</p>
        <Link className="btn-primary" href="/dashboard">Back to Dashboard</Link>
      </section>
    </main>
  );
}
