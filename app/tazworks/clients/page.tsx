import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { listTazworksClients, normalizeTazworksClientList } from "@/lib/tazworks";
import { filterTazworksClientOptions, getTazworksAccessStatus } from "@/lib/tazworksAccess";
import { requireUser } from "@/lib/session";
import { listTazworksSavedClients } from "@/lib/tazworksSavedClients";

function matches(row: any, q: string) {
  if (!q) return true;
  const text = `${row.name || ""} ${row.client_code || row.code || ""} ${row.client_guid || row.guid || ""}`.toLowerCase();
  return text.includes(q.toLowerCase());
}

export default async function TazworksClientsPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string; updated?: string; q?: string; showInactive?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const params = await searchParams;
  const q = String(params.q || "").trim();
  const showInactive = params.showInactive === "1";
  const access = getTazworksAccessStatus();
  let liveClients = [] as ReturnType<typeof normalizeTazworksClientList>;
  let savedClients: any[] = [];
  let error = params.error || "";
  try {
    const data = await listTazworksClients(0, 100);
    liveClients = normalizeTazworksClientList(data).filter((client) => matches(client, q));
  } catch (err: any) {
    error = err?.message || "client_pull_failed";
  }
  try {
    const rows = (await listTazworksSavedClients(showInactive, q)).filter((client) => showInactive || client.is_active);
    const allowed = filterTazworksClientOptions(rows.map((client) => ({ guid: client.client_guid, row: client })));
    savedClients = allowed.map((item) => item.row);
  } catch {}
  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>TazWorks Clients</h1><p style={{ color: "#5d687b" }}>{access.lockedMode ? `Client access is locked by server ENV. ${access.allowedClientCount} client GUID${access.allowedClientCount === 1 ? "" : "s"} allowed.` : "Manage saved client GUIDs and choose which client to pull orders from."}</p>{params.created ? <p style={{ color: "#167f49", fontWeight: 700 }}>Saved client added.</p> : null}{params.updated ? <p style={{ color: "#167f49", fontWeight: 700 }}>Saved client updated.</p> : null}{error ? <div className="card" style={{ borderColor: "#fda29b", background: "#fff5f5", color: "#b42318", fontWeight: 700, marginBottom: 18, padding: 16 }}>Could not pull live clients. Saved clients and manual GUID entry still work.</div> : null}<section className="card" style={{ padding: 18, marginBottom: 18 }}><form method="get" action="/tazworks/clients" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}><label style={{ flex: "1 1 260px" }}><span className="field-label">Search Clients</span><input className="field-input" name="q" defaultValue={q} placeholder="Name, code, or GUID" /></label><label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}><input type="checkbox" name="showInactive" value="1" defaultChecked={showInactive} /> Show inactive</label><button className="btn-secondary" type="submit">Filter</button><Link className="btn-muted" href="/tazworks/clients">Clear</Link></form></section>{!access.lockedMode ? <section className="card" style={{ padding: 18, marginBottom: 18 }}><h2 style={{ marginTop: 0 }}>Add Saved Client</h2><form action="/api/tazworks/saved-clients/create" method="post" style={{ display: "grid", gap: 12 }}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}><label><span className="field-label">Client Name</span><input className="field-input" name="name" required /></label><label><span className="field-label">Client Code</span><input className="field-input" name="clientCode" /></label><label><span className="field-label">Client GUID</span><input className="field-input" name="clientGuid" required /></label></div><label><span className="field-label">Notes</span><textarea className="field-input" name="notes" rows={2} /></label><button className="btn-primary" type="submit">Save Client</button></form></section> : null}<section className="card table-wrap" style={{ marginBottom: 18 }}><div style={{ padding: 18 }}><h2 style={{ margin: 0 }}>Saved Clients</h2><p style={{ color: "#5d687b" }}>{savedClients.length} saved client{savedClients.length === 1 ? "" : "s"} shown.</p></div><table><thead><tr><th>Client</th><th>Code</th><th>Status</th><th>Action</th></tr></thead><tbody>{savedClients.length ? savedClients.map((client: any) => <tr key={client.id}><td><strong>{client.name}</strong>{client.notes ? <><br /><span style={{ color: "#5d687b", fontSize: 12 }}>{client.notes}</span></> : null}</td><td>{client.client_code || ""}</td><td>{client.is_active ? "Active" : "Inactive"}</td><td><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Link style={{ color: "#0f3b5f", fontWeight: 800 }} href={`/tazworks/orders?clientGuid=${encodeURIComponent(client.client_guid)}&clientName=${encodeURIComponent(client.name)}&clientCode=${encodeURIComponent(client.client_code || "")}`}>Pull Orders</Link>{!access.lockedMode ? <Link style={{ color: "#0f3b5f", fontWeight: 800 }} href={`/tazworks/clients/${client.id}/edit`}>Edit</Link> : null}</div></td></tr>) : <tr><td colSpan={4}>No saved clients found.</td></tr>}</tbody></table></section><section className="card table-wrap"><div style={{ padding: 18 }}><h2 style={{ margin: 0 }}>Live TazWorks Clients</h2><p style={{ color: "#5d687b" }}>{liveClients.length} client{liveClients.length === 1 ? "" : "s"} returned by the API.</p></div><table><thead><tr><th>Client</th><th>Code</th><th>GUID</th><th>Action</th></tr></thead><tbody>{liveClients.length ? liveClients.map((client) => <tr key={client.guid}><td>{client.name}</td><td>{client.code || ""}</td><td style={{ fontSize: 12 }}>{client.guid}</td><td><Link style={{ color: "#0f3b5f", fontWeight: 800 }} href={`/tazworks/orders?clientGuid=${encodeURIComponent(client.guid)}&clientName=${encodeURIComponent(client.name)}&clientCode=${encodeURIComponent(client.code)}`}>Pull Orders</Link></td></tr>) : <tr><td colSpan={4}>No live clients returned.</td></tr>}</tbody></table></section></main></>;
}
