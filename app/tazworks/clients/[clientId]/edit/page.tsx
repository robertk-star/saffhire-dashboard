import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/session";
import { getTazworksSavedClient } from "@/lib/tazworksSavedClients";

export default async function EditTazworksSavedClientPage({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const { clientId } = await params;
  const query = await searchParams;
  const client = await getTazworksSavedClient(clientId);
  return <><AppHeader user={user} /><main className="container-shell"><Link href="/tazworks/clients" style={{ color: "#0f3b5f", fontWeight: 800 }}>← Back to Clients</Link><h1>Edit Saved TazWorks Client</h1>{query.error ? <p style={{ color: "#b42318", fontWeight: 700 }}>Could not save client. Check required fields and try again.</p> : null}{client ? <section className="card" style={{ padding: 22 }}><form action="/api/tazworks/saved-clients/update" method="post" style={{ display: "grid", gap: 14 }}><input type="hidden" name="id" value={client.id} /><label><span className="field-label">Client Name</span><input className="field-input" name="name" defaultValue={client.name} required /></label><label><span className="field-label">Client Code</span><input className="field-input" name="clientCode" defaultValue={client.client_code || ""} /></label><label><span className="field-label">Client GUID</span><input className="field-input" name="clientGuid" defaultValue={client.client_guid} required /></label><label><span className="field-label">Notes</span><textarea className="field-input" name="notes" rows={5} defaultValue={client.notes || ""} /></label><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button className="btn-primary" type="submit">Save Changes</button><Link className="btn-secondary" href={`/tazworks/orders?clientGuid=${encodeURIComponent(client.client_guid)}&clientName=${encodeURIComponent(client.name)}&clientCode=${encodeURIComponent(client.client_code || "")}`}>Pull Orders</Link><Link className="btn-muted" href="/tazworks/clients">Cancel</Link></div></form></section> : <section className="card" style={{ padding: 22 }}><p>Saved client not found.</p></section>}</main></>;
}
