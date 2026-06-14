import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/session";

export default async function SettingsPage() {
  const user = await requireUser(["admin"]);
  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>Settings</h1><section className="card" style={{ padding: 22 }}><h2 style={{ marginTop: 0 }}>Phase 1B Settings</h2><p style={{ color: "#5d687b", lineHeight: 1.5 }}>OpenAI review is active when the API key and model are configured. TazWorks and client-specific rules remain placeholders for later phases.</p></section></main></>;
}
