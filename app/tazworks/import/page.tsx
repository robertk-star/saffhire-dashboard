import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/session";

export default async function TazworksImportPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser(["admin", "supervisor"]);
  const params = await searchParams;
  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>Import TazWorks Sample JSON</h1><p style={{ color: "#5d687b" }}>Paste a sandbox/sample payload. This stores the raw payload and creates a normal SaffHire case from the mapped fields.</p>{params.error ? <p style={{ color: "#b42318", fontWeight: 700 }}>Import failed. Check the JSON format.</p> : null}<form action="/api/tazworks/import-json" method="post" className="card" style={{ display: "grid", gap: 16, padding: 22 }}><label><span className="field-label">Payload label</span><input className="field-input" name="label" placeholder="Example: Sample county criminal result" /></label><label><span className="field-label">TazWorks JSON payload</span><textarea className="field-input" name="payload" required placeholder='{"applicant":{"firstName":"John","lastName":"Doe","dob":"01/01/1980"},"records":[]}' /></label><button className="btn-primary" type="submit">Import Sample Payload</button></form></main></>;
}
