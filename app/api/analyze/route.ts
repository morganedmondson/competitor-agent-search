import { NextRequest, NextResponse } from "next/server";
import { scrapeAgency } from "@/lib/scraper";
import { findCompetitors } from "@/lib/places";
import type { AnalyzeRequest, AnalyzeResponse } from "@/types";

export async function POST(req: NextRequest) {
  let body: AnalyzeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, radius_km = 5, postcode_override } = body;
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    // Step 1: scrape the agency website
    const agency = await scrapeAgency(url);

    // Allow manual postcode override if scraper couldn't find one
    if (postcode_override) {
      agency.postcode = postcode_override.trim().toUpperCase();
    }

    // Step 2: find competitors via Google Places
    const competitors = await findCompetitors(agency, radius_km);

    const response: AnalyzeResponse = { agency, competitors };
    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
