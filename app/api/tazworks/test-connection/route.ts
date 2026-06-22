import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { getTazworksStatus, listTazworksClients } from "@/lib/tazworks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser(["admin", "supervisor"]);
  const status = getTazworksStatus();
  if (!status.configured) {
    await writeAuditLog({ user, action: "tazworks_check_failed", entityType: "tazworks", metadata: { reason: "missing_settings" } });
    return NextResponse.redirect(new URL("/tazworks?error=missing_settings", request.url), 303);
  }
  try {
    const data = await listTazworksClients(0, 1);
    const count = Array.isArray(data) ? data.length : data?.content?.length || data?.items?.length || data?.clients?.length || 0;
    await writeAuditLog({ user, action: "tazworks_check_success", entityType: "tazworks", metadata: { clientRows: count } });
    return NextResponse.redirect(new URL("/tazworks?connected=1", request.url), 303);
  } catch {
    await writeAuditLog({ user, action: "tazworks_check_failed", entityType: "tazworks", metadata: { reason: "request_failed" } });
    return NextResponse.redirect(new URL("/tazworks?error=connection_failed", request.url), 303);
  }
}
