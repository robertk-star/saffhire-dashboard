import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/session";
import { setTazworksSavedClientActive } from "@/lib/tazworksSavedClients";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser(["admin", "supervisor"]);
  const formData = await request.formData();
  const id = String(formData.get("id") || "").trim();
  const isActive = String(formData.get("isActive") || "") === "true";
  if (!id) return NextResponse.redirect(new URL("/tazworks/saved-clients?error=missing", request.url), 303);
  try {
    await setTazworksSavedClientActive(id, isActive);
    await writeAuditLog({ user, action: isActive ? "tazworks_saved_client_activated" : "tazworks_saved_client_deactivated", entityType: "tazworks_saved_client", entityId: id, metadata: { isActive } });
    return NextResponse.redirect(new URL("/tazworks/saved-clients?updated=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/tazworks/saved-clients?error=status", request.url), 303);
  }
}
