import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { updateTazworksSavedClient } from "@/lib/tazworksSavedClients";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser(["admin", "supervisor"]);
  const formData = await request.formData();
  const id = String(formData.get("id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const clientCode = String(formData.get("clientCode") || "").trim();
  const clientGuid = String(formData.get("clientGuid") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  if (!id || !name || !clientGuid) return NextResponse.redirect(new URL("/tazworks/saved-clients?error=missing", request.url), 303);
  try {
    await updateTazworksSavedClient({ id, name, clientCode, clientGuid, notes });
    await writeAuditLog({ user, action: "tazworks_saved_client_updated", entityType: "tazworks_saved_client", entityId: id, metadata: { name, clientCode, clientGuid } });
    return NextResponse.redirect(new URL("/tazworks/saved-clients?updated=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/tazworks/saved-clients?error=update", request.url), 303);
  }
}
