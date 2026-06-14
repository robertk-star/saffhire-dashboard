import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/session";

export default async function DocumentsPage() {
  const user = await requireUser();
  return (
    <>
      <AppHeader user={user} />
      <main className="container-shell">
        <h1 style={{ marginTop: 0 }}>Document Library</h1>
        <section className="card" style={{ padding: 22 }}>
          <h2 style={{ marginTop: 0 }}>Phase 1A Placeholder</h2>
          <p style={{ color: "#5d687b", lineHeight: 1.5 }}>
            Admin-only PDF upload, document versioning, searchable chunks, and citation-backed AI review are planned for Phase 1B.
          </p>
          <ul style={{ lineHeight: 1.8 }}>
            <li>SaffHire SOPs</li>
            <li>Federal FCRA references</li>
            <li>Court review procedures</li>
            <li>National database review procedures</li>
            <li>Training examples</li>
          </ul>
        </section>
      </main>
    </>
  );
}
