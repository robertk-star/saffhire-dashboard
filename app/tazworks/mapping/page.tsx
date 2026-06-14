import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/session";

const rows = [
  ["Applicant name", "applicant.name, applicant.fullName, first/middle/last, report.applicantName"],
  ["DOB", "applicant.dob, applicant.dateOfBirth, report.dob"],
  ["Report ID", "report.id, report.reportId, report.orderId, report.reference"],
  ["Jurisdiction", "report.jurisdiction, report.county, report.state"],
  ["Records", "criminal, criminalRecords, records, charges"],
  ["Created case review type", "National Database Review"],
  ["Created case source", "TazWorks sample import"],
];

export default async function TazworksMappingPage() {
  const user = await requireUser(["admin", "supervisor"]);
  return <><AppHeader user={user} /><main className="container-shell"><h1 style={{ marginTop: 0 }}>TazWorks Field Mapping</h1><p style={{ color: "#5d687b" }}>Phase 1E uses flexible sample-payload mapping. Final endpoint mapping should be updated after sandbox payloads are confirmed.</p><section className="card table-wrap"><table><thead><tr><th>SaffHire Field</th><th>Accepted Payload Paths</th></tr></thead><tbody>{rows.map(([label, source]) => <tr key={label}><td>{label}</td><td><code>{source}</code></td></tr>)}</tbody></table></section><section className="card" style={{ marginTop: 18, padding: 22 }}><h2 style={{ marginTop: 0 }}>Next Live-Connection Steps</h2><ol style={{ lineHeight: 1.8 }}><li>Confirm exact TazAPI Advanced sandbox endpoint URLs.</li><li>Confirm authentication method and token response shape.</li><li>Pull a sample completed criminal report payload.</li><li>Replace flexible sample mapping with exact production mapping.</li><li>Keep production pull disabled until sandbox import is verified.</li></ol></section></main></>;
}
