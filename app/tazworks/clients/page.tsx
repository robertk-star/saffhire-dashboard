import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { listTazworksClients, normalizeTazworksClientList } from "@/lib/tazworks";
import { requireUser } from "@/lib/session";

export default async function TazworksClientsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const params = await searchParams;
  let clients = [] as ReturnType<typeof normalizeTazworksClientList>;
  let error = params.error || "";
  try {
    const data = await listTazworksClients(0, 100);
    clients = normalizeTazworksClientList(data);
  } catch (err: any) {
    error = err?.message || "client_pull_failed";
  }
  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>TazWorks Clients</h1><p style={{ color: "#5d687b" }}>Choose a TazWorks client before pulling orders. This lets one dashboard work across multiple client accounts through the same fixed-IP proxy.</p>{error ? <div className="card" style={{ borderColor: "#fda29b", background: "#fff5f5", color: "#b42318", fontWeight: 700, marginBottom: 18, padding: 16 }}>Could not pull clients. Check the proxy, token permissions, and TazWorks client access.</div> : null}<section className="card" style={{ padding: 18, marginBottom: 18 }}><Link className="btn-primary" href="/tazworks/orders">Go to Pull Orders</Link><span style={{ marginLeft: 12, color: "#5d687b" }}>{clients.length} client{clients.length === 1 ? "" : "s"} returned</span></section><section className="card table-wrap"><table><thead><tr><th>Client</th><th>Code</th><th>GUID</th><th>Action</th></tr></thead><tbody>{clients.length ? clients.map((client) => <tr key={client.guid}><td>{client.name}</td><td>{client.code || ""}</td><td style={{ fontSize: 12 }}>{client.guid}</td><td><Link style={{ color: "#0f3b5f", fontWeight: 800 }} href={`/tazworks/orders?clientGuid=${encodeURIComponent(client.guid)}&clientName=${encodeURIComponent(client.name)}&clientCode=${encodeURIComponent(client.code)}`}>Select Client</Link></td></tr>) : <tr><td colSpan={4}>No clients returned.</td></tr>}</tbody></table></section></main></>;
}
