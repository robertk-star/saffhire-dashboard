import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { getDocumentDetail } from "@/lib/documents";
import { requireUser } from "@/lib/session";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { document, chunks } = await getDocumentDetail(id);
  if (!document) notFound();
  return <><AppHeader user={user} /><main className="container-shell"><Link href="/documents" style={{ color: "#0f3b5f", fontWeight: 700 }}>← Back to documents</Link><section className="card" style={{ marginTop: 16, padding: 22 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><div><h1 style={{ margin: "0 0 8px" }}>{document.document_name}</h1><p style={{ color: "#5d687b", margin: 0 }}>{document.document_type}</p></div>{document.is_active ? <span className="badge badge-closed">Active</span> : <span className="badge badge-archived">Inactive</span>}</div><p style={{ lineHeight: 1.6 }}>{document.notes || "No notes entered."}</p></section><section className="card table-wrap" style={{ marginTop: 18 }}><table><thead><tr><th>Version</th><th>Filename</th><th>Uploaded</th></tr></thead><tbody>{document.document_versions?.length ? document.document_versions.map((version: any) => <tr key={version.id}><td>{version.version_number}</td><td>{version.original_filename || "Document"}</td><td>{new Date(version.created_at).toLocaleString()}</td></tr>) : <tr><td colSpan={3}>No versions found.</td></tr>}</tbody></table></section><section className="card" style={{ marginTop: 18, padding: 22 }}><h2 style={{ marginTop: 0 }}>Stored Text Chunks</h2><p style={{ color: "#5d687b" }}>Showing the first stored chunks used for AI source matching.</p>{chunks.length ? chunks.map((chunk: any) => <pre key={chunk.id} style={{ background: "#f8fafc", borderRadius: 12, padding: 12, whiteSpace: "pre-wrap" }}>Chunk {chunk.chunk_index + 1}\n{chunk.chunk_text}</pre>) : <p>No chunks found.</p>}</section></main></>;
}
