import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { listTazworksApplicants } from "@/lib/tazworks";

export const runtime = "nodejs";

function rows(data: any) {
  return Array.isArray(data) ? data : data?.content || data?.items || data?.applicants || data?.data || data?.results || data?.records || [];
}

function clean(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function dateOnly(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function tokens(value: string) {
  return value.toLowerCase().split(/[^a-z0-9]+/).map((token) => token.trim()).filter(Boolean);
}

function names(row: any) {
  return [row?.firstName, row?.middleName, row?.lastName].filter(Boolean).join(" ").trim();
}

function safeRow(row: any) {
  return {
    applicantGuid: row?.applicantGuid || row?.guid || row?.id || null,
    firstName: row?.firstName || null,
    middleName: row?.middleName || null,
    lastName: row?.lastName || null,
    dateOfBirth: row?.dateOfBirth || row?.dob || null,
  };
}

function nameMatches(inputName: string, row: any) {
  const inputTokens = tokens(inputName);
  const first = clean(String(row?.firstName || ""));
  const middle = clean(String(row?.middleName || ""));
  const last = clean(String(row?.lastName || ""));
  const rowFull = clean(names(row));
  const inputFull = clean(inputName);
  if (!inputFull) return true;
  if (rowFull === inputFull || rowFull.includes(inputFull) || inputFull.includes(rowFull)) return true;
  const firstHit = first ? inputTokens.includes(first) : false;
  const lastHit = last ? inputTokens.includes(last) : false;
  if (firstHit && lastHit) return true;
  const noMiddleRow = `${first}${last}`;
  const noMiddleInput = inputTokens.length >= 2 ? `${clean(inputTokens[0])}${clean(inputTokens[inputTokens.length - 1])}` : inputFull;
  if (noMiddleRow && noMiddleInput && noMiddleRow === noMiddleInput) return true;
  if (middle && inputTokens.includes(middle) && (firstHit || lastHit)) return true;
  return false;
}

function responseKeys(data: any) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  return Object.keys(data).slice(0, 25);
}

function rawType(data: any) {
  if (Array.isArray(data)) return "array";
  if (data === null) return "null";
  return typeof data;
}

function preview(data: any) {
  try {
    return JSON.stringify(data).slice(0, 1200);
  } catch {
    return String(data).slice(0, 1200);
  }
}

async function getApplicantPages(clientGuid: string) {
  const pages = [0, 1, 2];
  const pageResults: any[] = [];
  const allRows: any[] = [];
  for (const page of pages) {
    try {
      const data = await listTazworksApplicants(clientGuid, page, 30);
      const pageRows = rows(data);
      pageResults.push({
        page,
        size: 30,
        rowCount: pageRows.length,
        rawDataType: rawType(data),
        rawIsArray: Array.isArray(data),
        responseShapeKeys: responseKeys(data),
        rawPreview: preview(data),
      });
      allRows.push(...pageRows);
    } catch (err: any) {
      pageResults.push({ page, size: 30, error: err?.message || "page_pull_failed" });
    }
  }
  return { allRows, pageResults };
}

export async function GET(request: Request) {
  await requireUser(["admin", "supervisor"]);
  const url = new URL(request.url);
  const clientGuid = String(url.searchParams.get("clientGuid") || "").trim();
  const name = String(url.searchParams.get("name") || "").trim();
  const dob = String(url.searchParams.get("dob") || "").trim();
  if (!clientGuid) return NextResponse.json({ error: "MISSING_CLIENT_GUID" }, { status: 400 });
  const { allRows: applicantRows, pageResults } = await getApplicantPages(clientGuid);
  const dobKey = dateOnly(dob);
  const matches = applicantRows.filter((row: any) => {
    const rowDob = dateOnly(String(row?.dateOfBirth || row?.dob || ""));
    const dobMatch = dobKey ? rowDob === dobKey : true;
    return dobMatch && nameMatches(name, row);
  }).slice(0, 10).map(safeRow);
  const dobCandidates = applicantRows.filter((row: any) => {
    const rowDob = dateOnly(String(row?.dateOfBirth || row?.dob || ""));
    return dobKey ? rowDob === dobKey : false;
  }).slice(0, 10).map(safeRow);
  const nameCandidates = applicantRows.filter((row: any) => nameMatches(name, row)).slice(0, 10).map(safeRow);
  const firstRows = applicantRows.slice(0, 5).map(safeRow);
  return NextResponse.json({
    count: matches.length,
    matches,
    diagnostics: {
      totalApplicantsSeen: applicantRows.length,
      pagesChecked: pageResults,
      searchedName: name,
      searchedDob: dob,
      dobCandidates,
      nameCandidates,
      firstRows,
    },
  });
}
