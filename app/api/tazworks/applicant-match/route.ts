import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { listTazworksApplicants } from "@/lib/tazworks";

export const runtime = "nodejs";

function rows(data: any) {
  return Array.isArray(data) ? data : data?.content || data?.items || data?.applicants || [];
}

function normName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normDate(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function fullName(row: any) {
  return [row?.firstName, row?.middleName, row?.lastName].filter(Boolean).join(" ").trim();
}

export async function GET(request: Request) {
  await requireUser(["admin", "supervisor"]);
  const url = new URL(request.url);
  const clientGuid = String(url.searchParams.get("clientGuid") || "").trim();
  const name = String(url.searchParams.get("name") || "").trim();
  const dob = String(url.searchParams.get("dob") || "").trim();
  if (!clientGuid) return NextResponse.json({ error: "MISSING_CLIENT_GUID" }, { status: 400 });
  const data = await listTazworksApplicants(clientGuid, 0, 500);
  const applicantRows = rows(data);
  const nameKey = normName(name);
  const dobKey = normDate(dob);
  const matches = applicantRows.filter((row: any) => {
    const rowName = normName(fullName(row));
    const rowDob = normDate(String(row?.dateOfBirth || row?.dob || ""));
    const nameMatch = nameKey ? rowName === nameKey || rowName.includes(nameKey) || nameKey.includes(rowName) : true;
    const dobMatch = dobKey ? rowDob === dobKey : true;
    return nameMatch && dobMatch;
  }).slice(0, 10).map((row: any) => ({
    applicantGuid: row?.applicantGuid || row?.guid || row?.id || null,
    firstName: row?.firstName || null,
    middleName: row?.middleName || null,
    lastName: row?.lastName || null,
    dateOfBirth: row?.dateOfBirth || row?.dob || null,
  }));
  return NextResponse.json({ count: matches.length, matches });
}
