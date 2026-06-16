type Row = Record<string, any>;

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(s).filter(Boolean).join("; ");
  if (typeof v === "object") return Object.values(v as Record<string, unknown>).map(s).filter(Boolean).join("; ");
  return String(v);
}

function up(v: unknown): string { return s(v).toUpperCase(); }

function dateFrom(v: unknown): Date | null {
  const raw = s(v).trim();
  if (!raw) return null;
  const m = raw.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})|(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (!m) return null;
  const y = Number(m[1] || m[6]);
  const mo = Number(m[2] || m[4]);
  const d = Number(m[3] || m[5]);
  const out = new Date(Date.UTC(y, mo - 1, d));
  return Number.isNaN(out.getTime()) ? null : out;
}

function bestDate(r: Row): { label: string; date: Date | null } {
  const pairs: Array<[string, unknown]> = [["Disposition Date", r.disposition_date || r.dispositionDate], ["File Date", r.file_date || r.fileDate], ["Offense Date", r.offense_date || r.offenseDate]];
  for (const [label, val] of pairs) {
    const date = dateFrom(val);
    if (date) return { label, date };
  }
  return { label: "Unknown", date: null };
}

function years(date: Date, now = new Date()): number {
  return (now.getTime() - date.getTime()) / 31557600000;
}

function dateText(date: Date | null): string { return date ? date.toISOString().slice(0, 10) : "Unknown"; }

function dispType(r: Row): string {
  const t = up([r.disposition, r.status, r.decision, r.charges, r.why].join(" "));
  if (/ADJUDICATION WITHHELD|WITHHELD ADJUDICATION|WITHHOLD/.test(t)) return "Adjudication Withheld";
  if (/DEFERRED|DIVERSION|FIRST OFFENDER/.test(t)) return "Deferred";
  if (/GUILTY|CONVICTED|CONVICTION|NO CONTEST|NOLO/.test(t)) return "Conviction Type";
  if (/DISMISSED|NOLLE|NO ACTION|DROPPED|ABANDONED|ACQUITTED|NOT GUILTY/.test(t)) return "Non-Conviction Type";
  if (/PENDING|OPEN|ACTIVE|AWAITING|FILED/.test(t)) return "Pending/Open";
  return "Unknown";
}

function leadOnly(r: Row): boolean {
  const t = up([r.source, r.record_title, r.court, r.status].join(" "));
  const hasCase = Boolean(s(r.case_number).trim());
  const hasCharge = Boolean(s(r.charges).trim());
  const hasStatus = Boolean(s(r.disposition).trim() || s(r.status).trim());
  return /JAIL|BOOKING|ARRESTS/.test(t) && (!hasCase || !hasCharge || !hasStatus);
}

export function applySaffhireReportability(output: any): any {
  const rows = Array.isArray(output?.record_reviews) ? output.record_reviews : [];
  if (!rows.length) return output;
  const now = new Date();
  const record_reviews = rows.map((r: Row) => {
    const dateInfo = bestDate(r);
    const age = dateInfo.date ? years(dateInfo.date, now) : null;
    const isFuture = dateInfo.date ? dateInfo.date.getTime() > now.getTime() : false;
    const type = dispType(r);
    let status = "NEEDS REVIEW";
    let seven = "UNKNOWN";
    let client = "Review Before Reporting";
    let reason = "A date or source detail is missing, so a reviewer must confirm before final use.";
    if (isFuture) {
      seven = "FUTURE / VERIFY DATE";
      reason = "The selected date appears to be in the future. Verify the source before final use.";
    } else if (leadOnly(r)) {
      status = "NOT REPORTABLE";
      seven = age === null ? "UNKNOWN" : age <= 7 ? "WITHIN 7 YEARS" : "OLDER THAN 7 YEARS";
      client = "Do Not Report";
      reason = "This appears to be a jail or booking lead without enough court detail. Use only as a lead if a matching court case exists.";
    } else if (age !== null && age <= 7) {
      status = "REPORTABLE";
      seven = "WITHIN 7 YEARS";
      client = "Report Using Exact Court Wording";
      reason = "The item is inside SaffHire's strict 7-year policy. Use the source wording exactly and do not convert the outcome label.";
    } else if (age !== null && age > 7) {
      status = "NOT REPORTABLE";
      seven = "OLDER THAN 7 YEARS";
      client = "Do Not Report";
      reason = "The item is older than SaffHire's strict 7-year policy.";
    }
    return { ...r, disposition_type: type, reportability_status: status, seven_year_status: seven, reportability_date_used: `${dateInfo.label}: ${dateText(dateInfo.date)}`, client_display: client, exact_court_wording: s(r.status || r.disposition || type), do_not_label_as: type === "Adjudication Withheld" || type === "Deferred" ? ["Conviction", "Guilty", "Dismissed"] : [], reportability_reason: reason };
  });
  return { ...output, record_reviews, reportability_policy: "SaffHire default: strict 7-year review. Items inside 7 years may be reportable using exact source wording unless they are lead-only or cannot be verified. Items older than 7 years are not reportable under this default policy.", reportability_summary: [`Reportable records: ${record_reviews.filter((r: Row) => r.reportability_status === "REPORTABLE").length}`, `Not reportable records: ${record_reviews.filter((r: Row) => r.reportability_status === "NOT REPORTABLE").length}`, `Needs review records: ${record_reviews.filter((r: Row) => r.reportability_status === "NEEDS REVIEW").length}`] };
}
