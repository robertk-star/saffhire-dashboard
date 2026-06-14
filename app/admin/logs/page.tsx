import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/session";

export default async function LogsPage() {
  const user = await requireUser(["admin"]);
  return (
    <>
      <AppHeader user={user} />
      <main className="container-shell">
        <h1 style={{ marginTop: 0 }}>Audit Logs</h1>
        <section className="card" style={{ padding: 22 }}>
          <p style={{ color: "#5d687b", lineHeight: 1.5 }}>Log storage is included in the Phase 1A SQL migration.</p>
        </section>
      </main>
    </>
  );
}
