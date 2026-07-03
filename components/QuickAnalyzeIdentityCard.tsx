function clean(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function isBad(value: string, allowGuid = false) {
  if (!value) return true;
  if (/^not found/i.test(value)) return true;
  if (/^history:\s*not found$/i.test(value)) return true;
  if (/^names:\s*not found$/i.test(value)) return true;
  if (/^s:\s*not found$/i.test(value)) return true;
  if (/tazworks/i.test(value)) return true;
  if (/displayname|displayvalue|modifieddate/i.test(value)) return true;
  if (!allowGuid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return true;
  if (/^\{|^\}|":/.test(value)) return true;
  return false;
}

function unique(values: string[], allowGuid = false) {
  const seen = new Set<string>();
  return values.map(clean).filter((value) => !isBad(value, allowGuid)).filter((value) => {
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
  return value.split(/;|\|/g).map(clean).filter(Boolean);
}

function getIdentity(row: any) {
  const raw = `${row?.full_text || ""}\n${row?.pasted_text || ""}`;
  const nameLine = lineValue(raw, "Name Searched") || lineValue(raw, "Applicant") || "";
  const aliasLine = lineValue(raw, "Alias Names") || "";
  const dobLine = lineValue(raw, "DOB") || "";
  const addressLine = lineValue(raw, "Address History") || "";
  const clientLine = lineValue(raw, "Client / Company") || lineValue(raw, "Client") || "";
  const clientCodeLine = lineValue(raw, "Client Code") || "";
  const fileLine = lineValue(raw, "File Number") || "";
  const applicantGuidLine = lineValue(raw, "Applicant GUID") || "";
  const emailLine = lineValue(raw, "Applicant Email") || "";
  const productLine = lineValue(raw, "Product Name") || "";
  const productGuidLine = lineValue(raw, "Product GUID") || "";
  const includedSearchesLine = lineValue(raw, "Included Searches") || "";
  const orderStatusLine = lineValue(raw, "Order Status") || "";
  const searchTypeLine = lineValue(raw, "Search Type") || "";
  const searchStatusLine = lineValue(raw, "Search Status") || "";
  return {
    names: unique([row?.person_name || "", ...splitValues(nameLine)]),
    aliases: unique(splitValues(aliasLine)),
    dobs: unique([row?.dob || "", ...splitValues(dobLine)]),
    addresses: unique(splitValues(addressLine)),
    orderContext: {
      fileNumber: unique(splitValues(fileLine), true),
      client: unique(splitValues(clientLine), true),
      clientCode: unique(splitValues(clientCodeLine), true),
      applicantGuid: unique(splitValues(applicantGuidLine), true),
      email: unique(splitValues(emailLine), true),
      product: unique(splitValues(productLine), true),
      productGuid: unique(splitValues(productGuidLine), true),
      includedSearches: unique(splitValues(includedSearchesLine), true),
      orderStatus: unique(splitValues(orderStatusLine), true),
      searchType: unique(splitValues(searchTypeLine), true),
      searchStatus: unique(splitValues(searchStatusLine), true),
    },
  };
}

function IdentityList({ label, values }: { label: string; values: string[] }) {
  return <div><strong>{label}</strong>{values.length ? <ul style={{ lineHeight: 1.7, marginBottom: 0, marginTop: 8 }}>{values.map((value, index) => <li key={index}>{value}</li>)}</ul> : <p style={{ color: "#5d687b", marginBottom: 0 }}>Not found in file.</p>}</div>;
}

export function QuickAnalyzeIdentityCard({ row }: { row: any }) {
  const identity = getIdentity(row);
  return <section className="card" style={{ background: "#f8fafc", borderColor: "#0f3b5f", marginTop: 18, padding: 22 }}><h2 style={{ marginTop: 0 }}>Identity Pulled From File</h2><p style={{ color: "#5d687b", marginTop: 0 }}>Use this to verify the analyzer is comparing records against the right person and client order.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}><IdentityList label="File Number" values={identity.orderContext.fileNumber} /><IdentityList label="Client / Company" values={identity.orderContext.client} /><IdentityList label="Client Code" values={identity.orderContext.clientCode} /><IdentityList label="Applicant GUID" values={identity.orderContext.applicantGuid} /><IdentityList label="Name" values={identity.names} /><IdentityList label="DOB" values={identity.dobs} /><IdentityList label="Applicant Email" values={identity.orderContext.email} /><IdentityList label="Product" values={identity.orderContext.product} /><IdentityList label="Product GUID" values={identity.orderContext.productGuid} /><IdentityList label="Included Searches" values={identity.orderContext.includedSearches} /><IdentityList label="Search Type" values={identity.orderContext.searchType} /><IdentityList label="Search Status" values={identity.orderContext.searchStatus} /><IdentityList label="Alias Names" values={identity.aliases} /><IdentityList label="Address Information" values={identity.addresses} /></div></section>;
}
