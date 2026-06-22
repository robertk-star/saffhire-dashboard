import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { getDefaultTazworksClientGuid, getTazworksStatus, listTazworksClients, listTazworksOrders } from "@/lib/tazworks";

export const runtime = "nodejs";

function redirectWithError(request: Request, code: string) {
  return NextResponse.redirect(new URL(`/tazworks?error=${encodeURIComponent(code)}`, request.url), 303);
}

export async function POST(request: Request) {
  const user = await requireUser(["admin", "supervisor"]);
  const status = getTazworksStatus();
  const clientGuid = getDefaultTazworksClientGuid();
  if (!status.configured) {
    await writeAuditLog({ user, action: "tazworks_check_failed", entityType: "tazworks", metadata: { reason: "missing_settings" } });
    return redirectWithError(request, status.tokenSet ? "missing_base_url" : "missing_token");
  }
  try {
    if (clientGuid) {
      const data = await listTazworksOrders(clientGuid, 0, 1);
      const count = Array.isArray(data) ? data.length : data?.content?.length || data?.items?.length || data?.orders?.length || 0;
      await writeAuditLog({ user, action: "tazworks_check_success", entityType: "tazworks", metadata: { method: "orders", rows: count } });
      return NextResponse.redirect(new URL("/tazworks?connected=1", request.url), 303);
    }
    const data = await listTazworksClients(0, 1);
    const count = Array.isArray(data) ? data.length : data?.content?.length || data?.items?.length || data?.clients?.length || 0;
    await writeAuditLog({ user, action: "tazworks_check_success", entityType: "tazworks", metadata: { method: "clients", rows: count } });
    return NextResponse.redirect(new URL("/tazworks?connected=1", request.url), 303);
  } catch (error: any) {
    const message = String(error?.message || "request_failed").toLowerCase();
    const code = message.includes("not_authorized") || message.includes("not authorized") ? "not_authorized" : message.includes("not_authenticated") || message.includes("not authenticated") ? "not_authenticated" : clientGuid ? "orders_check_failed" : "clients_check_failed";
    await writeAuditLog({ user, action: "tazworks_check_failed", entityType: "tazworks", metadata: { reason: code, method: clientGuid ? "orders" : "clients" } });
    return redirectWithError(request, code);
  }
}
