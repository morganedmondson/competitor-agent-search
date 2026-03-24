import { NextRequest, NextResponse } from "next/server";
import { enrichCompetitor } from "@/lib/apollo";
import type { EnrichRequest } from "@/types";

export async function POST(req: NextRequest) {
  let body: EnrichRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { domain, company_name, place_id } = body;
  if (!place_id || !company_name) {
    return NextResponse.json(
      { error: "place_id and company_name are required" },
      { status: 400 }
    );
  }

  try {
    const result = await enrichCompetitor(domain, company_name, place_id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
