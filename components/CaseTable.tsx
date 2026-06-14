import Link from "next/link";
import { getReviewTypeLabel, getStatusBadgeClass, getStatusLabel } from "@/lib/cases";

export function CaseTable({ cases }: { cases: any[] }) {
  if (!cases.length) {
    return <div className="card" style={{ padding: 22 }}>No cases found.</div>;
  }

  return (
    <div className="card table-wrap">
      <table>
        <thead>
          <tr><th>Subject</th><th>Review Type</th><th>Jurisdiction</th><th>Status</th><th>Updated</th></tr>
        </thead>
        <tbody>
          {cases.map((item) => (
            <tr key={item.id}>
              <td>
                <Link href={`/cases/${item.id}`} style={{ color: "#0f3b5f", fontWeight: 800 }}>{item.subject_name}</Link>
                <div style={{ color: "#5d687b", fontSize: 13, marginTop: 4 }}>{item.external_reference_number || "No reference number"}</div>
              </td>
              <td>{getReviewTypeLabel(item.review_type)}</td>
              <td>{[item.county, item.state].filter(Boolean).join(", ") || item.jurisdiction || "Not entered"}</td>
              <td><span className={getStatusBadgeClass(item.status)}>{getStatusLabel(item.status)}</span></td>
              <td>{item.updated_at ? new Date(item.updated_at).toLocaleString() : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
