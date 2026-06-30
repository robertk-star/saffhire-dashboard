import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { createTazworksSavedClient } from "@/lib/tazworksSavedClients";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser(["admin", "supervisor"]);
  const formData = await request.formData();
  const name = String(formData.get("name") || "").trim();
  const clientCode = String(formData.get("clientCode") || "").trim();
  const clientGuid = String(formData.get("clientGuid") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  if (!name || !clientGuid) return NextResponse.redirect(new URL("/tazworks/clients?error=missing", request.url), 303);
  try {
    const row = await createTazworksSavedClient({ name, clientCode, clientGuid, notes, actorEmail: user.email });
    await writeAuditLog({ user, action: "tazworks_saved_client_created", entityType: "tazworks_saved_client", entityId: row.id, metadata: { name, clientCode, clientGuid } });
    return NextResponse.redirect(new URL("/tazworks/clients?created=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/tazworks/clients?error=create", request.url), 303);
  }
}
