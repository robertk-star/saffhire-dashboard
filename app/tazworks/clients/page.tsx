import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { listTazworksClients } from "@/lib/tazworks";
import { requireUser } from "@/lib/session";

function getGuid(row: any) { return row.clientGuid || row.guid || row.id || row.clientIdentifier || ""; }

export default async function TazworksClientsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const params = await searchParams;
  let clients: any[] = [];
  let error = params.error || "";
  try {
    const data = await listTazworksClients(0, 50);
    clients = Array.isArray(data) ? data : data?.content || data?.items || data?.clients || [];
  } catch (err: any) {
    error = err?.message || "client_pull_failed";
  }
  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>TazWorks Clients</h1><p style={{ color: "#5d687b" }}>Choose a TazWorks client, then pull recent orders from the sandbox/API.</p>{error ? <p style={{ color: "#b42318", fontWeight: 700 }}>Could not pull clients. Check TazWorks ENV settings and token permissions.</p> : null}<section className="card table-wrap"><table><thead><tr><th>Client</th><th>Code</th><th>GUID</th><th>Action</th></tr></thead><tbody>{clients.length ? clients.map((row: any, index: number) => { const guid = getGuid(row); return <tr key={guid || index}><td>{row.name || row.clientName || row.displayName || "Unnamed client"}</td><td>{row.code || row.clientCode || ""}</td><td style={{ fontSize: 12 }}>{guid || "Not found"}</td><td>{guid ? <Link style={{ color: "#0f3b5f", fontWeight: 800 }} href={`/tazworks/orders?clientGuid=${encodeURIComponent(guid)}`}>View Orders</Link> : "No GUID"}</td></tr>; }) : <tr><td colSpan={4}>No clients returned.</td></tr>}</tbody></table></section></main></>;
}
