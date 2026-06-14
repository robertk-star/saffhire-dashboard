export function SetupNotice() {
  return <div className="card" style={{ borderColor: "#f3c846", marginBottom: 20, padding: 18 }}><h2 style={{ margin: "0 0 8px" }}>Database setup needed</h2><p style={{ color: "#5d687b", lineHeight: 1.5, margin: 0 }}>Run the Supabase migrations and add the required Vercel environment variables before testing saved cases, document uploads, and AI review.</p></div>;
}
