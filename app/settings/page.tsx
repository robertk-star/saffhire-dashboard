import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/session";

export default async function SettingsPage() {
  const user = await requireUser(["admin"]);
  return (
    <>
      <AppHeader user={user} />
      <main className="container-shell">
        <h1 style={{ marginTop: 0 }}>Settings</h1>
        <section className="card" style={{ padding: 22 }}>
          <p style={{ color: "#5d687b", lineHeight: 1.5 }}>Settings placeholders are included for later phases.</p>
        </section>
      </main>
    </>
  );
}
