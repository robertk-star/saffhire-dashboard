import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/session";
import { getTazworksStatus } from "@/lib/tazworks";

export default async function SettingsPage() {
  const user = await requireUser(["admin"]);
  const taz = getTazworksStatus();
  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>Settings</h1><section className="card" style={{ padding: 22, marginBottom: 18 }}><h2 style={{ marginTop: 0 }}>AI Review</h2><p style={{ color: "#5d687b", lineHeight: 1.5 }}>OpenAI review is active when the OpenAI values are configured in Vercel.</p></section><section className="card" style={{ padding: 22 }}><h2 style={{ marginTop: 0 }}>TazWorks</h2><p style={{ color: "#5d687b", lineHeight: 1.5 }}>TazWorks pulls are read-only. The dashboard only reads clients, orders, searches, and search results.</p><ul style={{ lineHeight: 1.8 }}><li>Connection route: {taz.proxyMode ? "DigitalOcean fixed-IP proxy" : "Direct from Vercel"}</li><li>Proxy Base URL: {taz.proxyBaseUrlSet ? "Set" : "Not set"}</li><li>Proxy Secret: {taz.proxySecretSet ? "Set" : "Missing"}</li><li>Direct TazWorks Base URL: {taz.baseUrlSet ? "Set" : "Using default sandbox"}</li><li>Direct Bearer Credential: {taz.tokenSet ? "Set" : "Missing"}</li><li>Default Client GUID: {taz.defaultClientGuidSet ? "Set" : "Not set"}</li><li>Mode: {taz.sandboxMode ? "Sandbox" : "Live"}</li></ul></section></main></>;
}
