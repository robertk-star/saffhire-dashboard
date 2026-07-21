import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { requireUser } from "@/lib/session";
import {
  getAllTazworksSearchResults,
  getTazworksApplicantFromOrder,
  getTazworksOrder,
  getTazworksSearchResult,
} from "@/lib/tazworks";

type Mode = "national" | "county";

function valueText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function firstValue(...values: unknown[]) {
  for (const value of values) {
    const text = valueText(value).trim();
    if (text) return text;
  }
  return "";
}

function isNationalAlias(payload: any) {
  const type = String(payload?.type || "").toUpperCase();
  const name = String(payload?.displayName || "").toUpperCase();
  return type.includes("NATIONAL_CRIMINAL_DATABASE_ALIAS") || (name.includes("NATIONAL") && name.includes("CRIMINAL") && name.includes("ALIAS"));
}

function isCountyCriminal(payload: any) {
  const type = String(payload?.type || "").toUpperCase();
  const name = String(payload?.displayName || "").toUpperCase();
  return type.includes("COUNTY_CRIMINAL") || (name.includes("COUNTY") && name.includes("CRIM"));
}

function allSearchResultsArray(allResults: any): any[] {
  if (Array.isArray(allResults)) return allResults;
  if (Array.isArray(allResults?.results)) return allResults.results;
  if (Array.isArray(allResults?.searches)) return allResults.searches;
  if (Array.isArray(allResults?.data)) return allResults.data;
  return [];
}

function findNationalAliasSearch(allResults: any) {
  return allSearchResultsArray(allResults).find((search: any) => isNationalAlias(search));
}

function formatAddressInfos(addressInfos: any[] = []) {
  if (!Array.isArray(addressInfos) || !addressInfos.length) return "";

  const seen = new Set<string>();

  return addressInfos
    .flatMap((info: any) => {
      const fullName = valueText(info?.fullName);
      const dob = valueText(info?.dateOfBirth);
      const addresses = Array.isArray(info?.addresses) ? info.addresses : [];

      return addresses.map((address: any) => {
        const street = valueText(address?.streetOne);
        const city = valueText(address?.city);
        const state = valueText(address?.stateOrProvince);
        const postal = valueText(address?.postalCode);
        const county = valueText(address?.county);
        const startDate = valueText(address?.startDate);
        const endDate = valueText(address?.endDate);
        const location = [street, city, state, postal].filter(Boolean).join(", ");

        return [
          fullName ? `Name: ${fullName}` : "",
          dob ? `DOB: ${dob}` : "",
          location,
          county ? `County: ${county}` : "",
          startDate || endDate ? `Dates: ${startDate || "Unknown"} to ${endDate || "Unknown"}` : "",
        ].filter(Boolean).join(" | ");
      });
    })
    .filter((line: string) => {
      const key = line.toUpperCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\n");
}

function formatNationalVendorRecords(nationalSearch: any) {
  const records = nationalSearch?.results?.records;

  if (Array.isArray(records) && records.length) {
    return JSON.stringify(records, null, 2);
  }

  const result = String(nationalSearch?.result || "").toLowerCase();

  if (result === "no") {
    return "No national criminal hit records returned. Alias and address information were pulled from All Search Results.";
  }

  return "";
}

function formatApplicantAliases(applicant: any) {
  const aliases = Array.isArray(applicant?.aliases) ? applicant.aliases : [];
  if (!aliases.length) return "";

  return aliases
    .map((alias: any) => {
      const name = [alias?.firstName, alias?.middleName, alias?.lastName, alias?.generation].map(valueText).filter(Boolean).join(" ");
      const dob = valueText(alias?.dateOfBirth || alias?.dob);
      return [name ? `Alias: ${name}` : "", dob ? `DOB: ${dob}` : ""].filter(Boolean).join(" | ");
    })
    .filter(Boolean)
    .join("\n");
}

function formatApplicantAddresses(applicant: any) {
  const addresses = Array.isArray(applicant?.addresses) ? applicant.addresses : [];
  if (!addresses.length) return "";

  return addresses
    .map((address: any) => {
      const location = [address?.streetOne, address?.streetTwo, address?.city, address?.stateOrProvince || address?.state, address?.postalCode].map(valueText).filter(Boolean).join(", ");
      const county = valueText(address?.county);
      const startDate = valueText(address?.startDate || address?.fromDate || address?.dateFrom);
      const endDate = valueText(address?.endDate || address?.toDate || address?.dateTo);
      const dates = startDate || endDate ? `Dates: ${startDate || "Unknown"} to ${endDate || "Unknown"}` : "";
      return [location, county ? `County: ${county}` : "", dates].filter(Boolean).join(" | ");
    })
    .filter(Boolean)
    .join("\n");
}

function formatSelectedSearchVendorRecords(search: any, mode: Mode) {
  const results = search?.results;
  const recordCandidates = [
    results?.records,
    results?.recordDetails,
    results?.criminalRecords,
    results?.countyRecords,
    results?.cases,
    results?.offenses,
    results?.charges,
    results?.hits,
    results?.items,
  ];
  const records = recordCandidates.find((candidate) => Array.isArray(candidate) && candidate.length);

  if (Array.isArray(records) && records.length) {
    return JSON.stringify(records, null, 2);
  }

  if (results && typeof results === "object" && Object.keys(results).length) {
    return JSON.stringify(results, null, 2);
  }

  const result = String(search?.result || "").toLowerCase();
  if (mode === "county" && result === "no") {
    return "No county criminal hit records returned for the selected County Criminal Search.";
  }

  return "";
}

function buildCombinedSourceText(input: {
  fileNumber: string;
  clientName: string;
  clientCode: string;
  orderGuid: string;
  searchGuid: string;
  searchType: string;
  displayName: string;
  displayValue: string;
  personName: string;
  dob: string;
  aliasInformation: string;
  addressInformation: string;
  vendorRecords: string;
}) {
  return [
    `Search Type: ${input.searchType}`,
    `Display Name: ${input.displayName}`,
    `Display Value: ${input.displayValue}`,
    `Client: ${input.clientName}`,
    `Client Code: ${input.clientCode}`,
    `File Number: ${input.fileNumber}`,
    `Order GUID: ${input.orderGuid}`,
    `Search GUID: ${input.searchGuid}`,
    `Name: ${input.personName}`,
    `DOB: ${input.dob}`,
    "",
    "Alias Information:",
    input.aliasInformation || "Not provided.",
    "",
    "Address Information:",
    input.addressInformation || "Not provided.",
    "",
    "Vendor Records:",
    input.vendorRecords || "Not provided.",
  ].join("\n");
}

function ManualAnalysisForm({
  mode,
  orderGuid,
  searchGuid,
  clientGuid,
  search,
  order,
  applicant,
  aliasInformation,
  addressInformation,
  vendorRecords,
}: {
  mode: Mode;
  orderGuid: string;
  searchGuid: string;
  clientGuid: string;
  search: any;
  order: any;
  applicant: any;
  aliasInformation: string;
  addressInformation: string;
  vendorRecords: string;
}) {
  const reviewType = mode === "national" ? "national_crim" : "county_search";
  const title = mode === "national" ? "National Database Analysis" : "County Criminal Search Analysis";
  const helpText = mode === "national"
    ? "Review the auto-filled alias and address data before running the National Crim analysis."
    : "Review the auto-filled identity context and county vendor records before deciding whether each county record should be reported.";
  const fileNumber = firstValue(order?.fileNumber, order?.file_number, order?.referenceNumber);
  const clientName = firstValue(order?.clientName, order?.client_name, order?.companyName);
  const clientCode = firstValue(order?.clientCode, order?.client_code);
  const personName = firstValue(order?.applicantName, applicant?.fullName, [applicant?.lastName, applicant?.firstName].filter(Boolean).join(", "));
  const dob = firstValue(order?.applicantDateOfBirth, applicant?.dateOfBirth, applicant?.dob);
  const searchType = firstValue(search?.type, search?.displayName, mode === "national" ? "NATIONAL_CRIMINAL_DATABASE_ALIAS" : "COUNTY_CRIMINAL");
  const displayName = firstValue(search?.displayName);
  const displayValue = firstValue(search?.displayValue);
  const combinedText = buildCombinedSourceText({ fileNumber, clientName, clientCode, orderGuid, searchGuid, searchType, displayName, displayValue, personName, dob, aliasInformation, addressInformation, vendorRecords });

  return (
    <section className="card" style={{ marginTop: 18, padding: 22 }}>
      <h1 style={{ marginTop: 0 }}>{title}</h1>
      <p style={{ color: "#5d687b" }}>{helpText}</p>
      <form action="/api/analyze/quick" method="post" style={{ display: "grid", gap: 14 }}>
        <input type="hidden" name="review_type" value={reviewType} />
        <input type="hidden" name="reviewType" value={reviewType} />
        <input type="hidden" name="source_type" value="tazworks" />
        <input type="hidden" name="sourceType" value="tazworks" />
        <input type="hidden" name="reference_number" value={searchGuid} />
        <input type="hidden" name="referenceNumber" value={searchGuid} />
        <input type="hidden" name="order_guid" value={orderGuid} />
        <input type="hidden" name="orderGuid" value={orderGuid} />
        <input type="hidden" name="search_guid" value={searchGuid} />
        <input type="hidden" name="searchGuid" value={searchGuid} />
        <input type="hidden" name="client_guid" value={clientGuid} />
        <input type="hidden" name="clientGuid" value={clientGuid} />
        <input type="hidden" name="search_type" value={searchType} />
        <input type="hidden" name="searchType" value={searchType} />
        <input type="hidden" name="client" value={clientName} />
        <input type="hidden" name="client_name" value={clientName} />
        <input type="hidden" name="client_code" value={clientCode} />
        <input type="hidden" name="pasted_text" value={combinedText} />
        <input type="hidden" name="full_text" value={combinedText} />
        <input type="hidden" name="text" value={combinedText} />

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <label><span className="field-label">File Number</span><input className="field-input" name="file_number" defaultValue={fileNumber} /></label>
          <label><span className="field-label">Name</span><input className="field-input" name="person_name" defaultValue={personName} /></label>
          <label><span className="field-label">DOB</span><input className="field-input" name="dob" defaultValue={dob} /></label>
        </div>

        <label><span className="field-label">Alias Information</span><textarea className="field-input" name="alias_information" defaultValue={aliasInformation} rows={mode === "national" ? 5 : 4} /></label>
        <label><span className="field-label">Address Information</span><textarea className="field-input" name="address_information" defaultValue={addressInformation} rows={mode === "national" ? 10 : 6} /></label>
        <label><span className="field-label">{mode === "national" ? "Vendor Records" : "County Vendor Records"}</span><textarea className="field-input" name="vendor_records" defaultValue={vendorRecords} rows={mode === "national" ? 8 : 12} placeholder={mode === "county" ? "Include case number, court, county/state, charge, offense date, disposition, disposition date, sentence, and status." : undefined} /></label>
        <button className="btn-primary" type="submit">Analyze</button>
      </form>
    </section>
  );
}

export default async function TazworksSearchDetailPage({ params, searchParams }: { params: Promise<{ orderGuid: string; searchGuid: string }>; searchParams: Promise<{ clientGuid?: string }> }) {
  const user = await requireUser(["admin", "supervisor", "analyzer"]);
  const { orderGuid, searchGuid } = await params;
  const query = await searchParams;
  const clientGuid = query.clientGuid || "";

  const [search, order, applicant] = clientGuid ? await Promise.all([
    getTazworksSearchResult(clientGuid, orderGuid, searchGuid).catch((err: unknown) => { console.error("Search result load failed", err); return null; }),
    getTazworksOrder(clientGuid, orderGuid).catch((err: unknown) => { console.error("Order detail load failed", err); return null; }),
    getTazworksApplicantFromOrder(clientGuid, orderGuid).catch((err: unknown) => { console.error("Applicant pull from order failed", err); return null; }),
  ]) : [null, null, null];

  const nationalAlias = isNationalAlias(search);
  const countyCriminal = isCountyCriminal(search);
  const manualMode: Mode | "" = nationalAlias ? "national" : countyCriminal ? "county" : "";
  let aliasInformation = "";
  let addressInformation = "";
  let vendorRecords = "";

  if (nationalAlias || countyCriminal) {
    const allSearchResults = clientGuid
      ? await getAllTazworksSearchResults(clientGuid, orderGuid).catch((err: unknown) => { console.error("Could not load all search results for identity context", err); return null; })
      : null;
    const nationalAliasSearch = findNationalAliasSearch(allSearchResults);
    aliasInformation = valueText(nationalAliasSearch?.results?.nameVariationsSearched) || formatApplicantAliases(applicant);
    addressInformation = formatAddressInfos(nationalAliasSearch?.results?.addressInfos || []) || formatApplicantAddresses(applicant);
    vendorRecords = nationalAlias ? formatNationalVendorRecords(nationalAliasSearch || search) : formatSelectedSearchVendorRecords(search, "county");
  }

  const backHref = user.role === "analyzer" ? "/tazworks/current-orders" : `/tazworks/orders/${orderGuid}${clientGuid ? `?clientGuid=${encodeURIComponent(clientGuid)}` : ""}`;

  return (
    <>
      <AppHeader user={user} />
      <main className="container-shell">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <Link href={backHref} style={{ color: "#0f3b5f", fontWeight: 700 }}>← Back</Link>
          <Link href="/tazworks/saved-analyses" style={{ color: "#0f3b5f", fontWeight: 700 }}>Saved Analyses</Link>
        </div>
        {!clientGuid ? <section className="card" style={{ borderColor: "#fda29b", background: "#fff5f5", color: "#b42318", fontWeight: 700, marginBottom: 18, padding: 16 }}>Missing client GUID. Go back to Current Orders or Orders and reopen this search so the correct client is passed through.</section> : null}
        {manualMode ? <ManualAnalysisForm mode={manualMode} orderGuid={orderGuid} searchGuid={searchGuid} clientGuid={clientGuid} search={search} order={order} applicant={applicant} aliasInformation={aliasInformation} addressInformation={addressInformation} vendorRecords={vendorRecords} /> : <section className="card" style={{ marginTop: 18, padding: 22 }}><h1 style={{ marginTop: 0 }}>{firstValue(search?.displayName, "Search Detail")}</h1><p style={{ color: "#5d687b" }}>{firstValue(search?.displayValue)}</p><pre style={{ background: "#f8fafc", borderRadius: 12, overflow: "auto", padding: 16, whiteSpace: "pre-wrap" }}>{JSON.stringify(search, null, 2)}</pre></section>}
      </main>
    </>
  );
}
