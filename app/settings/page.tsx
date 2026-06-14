import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/session";
import { getTazworksStatus } from "@/lib/tazworks";

export default async function SettingsPage() {
  const user = await requireUser(["admin"]);
  const taz = getTazworksStatus();
  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>Settings</h1><section className="card" style={{ padding: 22, marginBottom: 18 }}><h2 style={{ marginTop: 0 }}>AI Review</h2><p style={{ color: "#5d687b", lineHeight: 1.5 }}>OpenAI review is active when the OpenAI values are configured in Vercel.</p></section><section className="card" style={{ padding: 22 }}><h2 style={{ marginTop: 0 }}>TazWorks Prep</h2><p style={{ color: "#5d687b", lineHeight: 1.5 }}>Phase 1E only checks whether sandbox settings are present. It does not pull production data.</p><ul style={{ lineHeight: 1.8 }}><li>Base URL: {taz.baseUrlSet ? "Set" : "Missing"}</li><li>Client ID: {taz.clientIdSet ? "Set" : "Missing"}</li><li>Client Secret: {taz.clientSecretSet ? "Set" : "Missing"}</li><li>Mode: {taz.sandboxMode ? "Sandbox" : "Production flag off"}</li></ul></section></main></>;
}
