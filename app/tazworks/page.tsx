import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { getDefaultTazworksClientGuid, getTazworksStatus, listTazworksPayloads } from "@/lib/tazworks";
import { requireUser } from "@/lib/session";

function errorMessage(code?: string) {
  if (!code) return "";
  const messages: Record<string, string> = {
    missing_token: "Missing TazWorks API credential in Vercel.",
    missing_base_url: "Missing TazWorks base URL.",
    not_authorized: "TazWorks returned NOT_AUTHORIZED. Check app access, CRA registration, client access, or IP whitelist.",
    not_authenticated: "TazWorks returned NOT_AUTHENTICATED. Refresh the API credential and try again.",
    clients_check_failed: "The clients endpoint failed. Add a default client GUID and try Pull Orders, or confirm your app can access clients.",
    orders_check_failed: "The orders endpoint failed. Check the default client GUID and client access.",
    import_failed: "Import failed while pulling or saving the TazWorks search result.",
    quick_save: "The result was pulled but could not be saved to Quick Analyze. Check the Quick Review SQL migration.",
    missing_tazworks_ids: "Missing client, order, or search ID.",
    missing_settings: "Missing TazWorks settings in Vercel.",
    connection_failed: "TazWorks connection failed.",
  };
  return messages[code] || `TazWorks action failed: ${code}`;
}

export default async function TazworksPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string; imported?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const params = await searchParams;
  const status = getTazworksStatus();
  const defaultClientGuid = getDefaultTazworksClientGuid();
  const payloads = await listTazworksPayloads();
  const message = errorMessage(params.error);
  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>TazWorks Sandbox</h1><p style={{ color: "#5d687b" }}>Pull TazWorks sandbox/API orders and search results into SaffHire Quick Analyze.</p>{params.connected ? <p style={{ color: "#167f49", fontWeight: 700 }}>TazWorks read check passed.</p> : null}{params.imported ? <p style={{ color: "#167f49", fontWeight: 700 }}>Sample payload imported.</p> : null}{message ? <div className="card" style={{ borderColor: "#fda29b", background: "#fff5f5", color: "#b42318", fontWeight: 700, marginBottom: 18, padding: 16 }}>{message}</div> : null}<section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16, marginBottom: 22 }}><div className="card" style={{ padding: 18 }}><strong>Connection Status</strong><p>{status.configured ? "Configured" : "Not fully configured"}</p></div><div className="card" style={{ padding: 18 }}><strong>Mode</strong><p>{status.sandboxMode ? "Sandbox" : "Production flag is off"}</p></div><div className="card" style={{ padding: 18 }}><strong>Base URL</strong><p>{status.baseUrlSet ? "Set" : "Using default sandbox"}</p></div><div className="card" style={{ padding: 18 }}><strong>API Credential</strong><p>{status.tokenSet ? "Set" : "Missing"}</p></div><div className="card" style={{ padding: 18 }}><strong>Default Client</strong><p>{status.defaultClientGuidSet ? "Set" : "Not set"}</p></div></section><section className="card" style={{ display: "grid", gap: 14, marginBottom: 22, padding: 22 }}><h2 style={{ margin: 0 }}>Sandbox/API Actions</h2><div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}><form action="/api/tazworks/test-connection" method="post"><button className="btn-secondary" type="submit">Check Settings</button></form><Link className="btn-primary" href="/tazworks/clients">Pull Clients</Link><Link className="btn-primary" href={defaultClientGuid ? `/tazworks/orders?clientGuid=${encodeURIComponent(defaultClientGuid)}` : "/tazworks/orders"}>Pull Orders</Link><Link className="btn-secondary" href="/tazworks/import">Import Sample JSON</Link><Link className="btn-muted" href="/tazworks/mapping">View Field Mapping</Link></div><p style={{ color: "#5d687b", margin: 0 }}>Tip: If Pull Clients fails but Postman pulls orders, add the default client GUID in Vercel and use Pull Orders.</p></section><section className="card table-wrap"><table><thead><tr><th>Imported</th><th>Applicant</th><th>DOB</th><th>Report ID</th><th>Records</th><th>Action</th></tr></thead><tbody>{payloads.length ? payloads.map((row: any) => <tr key={row.id}><td>{new Date(row.created_at).toLocaleString()}</td><td>{row.applicant_name || "Not found"}</td><td>{row.dob || "Not found"}</td><td>{row.report_id || "Not found"}</td><td>{row.record_count || 0}</td><td><Link style={{ color: "#0f3b5f", fontWeight: 800 }} href={`/tazworks/payloads/${row.id}`}>View</Link></td></tr>) : <tr><td colSpan={6}>No TazWorks payloads imported yet.</td></tr>}</tbody></table></section></main></>;
}
