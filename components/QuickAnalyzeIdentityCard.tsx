function clean(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function isBad(value: string) {
  if (!value) return true;
  if (/^not found$/i.test(value)) return true;
  if (/^history:\s*not found$/i.test(value)) return true;
  if (/^names:\s*not found$/i.test(value)) return true;
  if (/^s:\s*not found$/i.test(value)) return true;
  if (/tazworks/i.test(value)) return true;
  if (/displayname|displayvalue|modifieddate/i.test(value)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return true;
  if (/^\{|^\}|":/.test(value)) return true;
  return false;
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.map(clean).filter((value) => !isBad(value)).filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}

function lineValue(raw: string, label: string) {
  const lines = raw.split(/\r?\n/g);
  const prefix = `${label}:`.toLowerCase();
  const found = lines.find((line) => line.trim().toLowerCase().startsWith(prefix));
  return found ? found.slice(found.indexOf(":") + 1).trim() : "";
}

function splitValues(value: string) {
  return value.split(/;|\||,/g).map(clean).filter(Boolean);
}

function getIdentity(row: any) {
  const raw = `${row?.full_text || ""}\n${row?.pasted_text || ""}`;
  const nameLine = lineValue(raw, "Name Searched") || lineValue(raw, "Applicant") || "";
  const aliasLine = lineValue(raw, "Alias Names") || "";
  const dobLine = lineValue(raw, "DOB") || "";
  const addressLine = lineValue(raw, "Address History") || "";
  return {
    names: unique([row?.person_name || "", ...splitValues(nameLine)]),
    aliases: unique(splitValues(aliasLine)),
    dobs: unique([row?.dob || "", ...splitValues(dobLine)]),
    addresses: unique(splitValues(addressLine)),
  };
}

function IdentityList({ label, values }: { label: string; values: string[] }) {
  return <div><strong>{label}</strong>{values.length ? <ul style={{ lineHeight: 1.7, marginBottom: 0, marginTop: 8 }}>{values.map((value, index) => <li key={index}>{value}</li>)}</ul> : <p style={{ color: "#5d687b", marginBottom: 0 }}>Not found in file.</p>}</div>;
}

export function QuickAnalyzeIdentityCard({ row }: { row: any }) {
  const identity = getIdentity(row);
  return <section className="card" style={{ background: "#f8fafc", borderColor: "#0f3b5f", marginTop: 18, padding: 22 }}><h2 style={{ marginTop: 0 }}>Identity Pulled From File</h2><p style={{ color: "#5d687b", marginTop: 0 }}>Use this to verify the analyzer is comparing records against the right person.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}><IdentityList label="Name" values={identity.names} /><IdentityList label="Alias Names" values={identity.aliases} /><IdentityList label="DOB" values={identity.dobs} /><IdentityList label="Address Information" values={identity.addresses} /></div></section>;
}
