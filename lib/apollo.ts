import axios from "axios";
import type { Contact, EnrichResponse } from "@/types";

const APOLLO_BASE = "https://api.apollo.io/v1";

// Titles we want to surface for the sales team
const TARGET_TITLES = [
  "owner",
  "founder",
  "director",
  "managing director",
  "md",
  "principal",
  "partner",
  "head",
  "manager",
  "branch manager",
  "sales manager",
  "lettings manager",
];

function isTargetTitle(title: string): boolean {
  const t = title.toLowerCase();
  return TARGET_TITLES.some((k) => t.includes(k));
}

function extractDomain(websiteOrDomain: string): string {
  try {
    const u = new URL(
      websiteOrDomain.startsWith("http")
        ? websiteOrDomain
        : `https://${websiteOrDomain}`
    );
    return u.hostname.replace(/^www\./, "");
  } catch {
    return websiteOrDomain.replace(/^www\./, "");
  }
}

interface ApolloOrgResult {
  linkedin_url?: string;
  estimated_num_employees?: number;
  founded_year?: number;
  short_description?: string;
}

interface ApolloPerson {
  first_name?: string;
  last_name?: string;
  title?: string;
  email?: string;
  linkedin_url?: string;
  phone_numbers?: Array<{ raw_number?: string }>;
}

export async function enrichCompetitor(
  website: string | undefined,
  companyName: string,
  placeId: string
): Promise<EnrichResponse> {
  const apiKey = process.env.APOLLO_API_KEY;

  if (!apiKey) {
    return { place_id: placeId, contacts: [], error: "APOLLO_API_KEY not set" };
  }

  const domain = website ? extractDomain(website) : null;

  // 1. Enrich organisation
  let org: ApolloOrgResult = {};
  try {
    const res = await axios.post(
      `${APOLLO_BASE}/organizations/enrich`,
      { domain, name: companyName },
      {
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        timeout: 10000,
      }
    );
    org = (res.data?.organization as ApolloOrgResult) ?? {};
  } catch {
    // Enrichment failed — carry on to people search
  }

  // 2. Search for decision-maker contacts
  const contacts: Contact[] = [];
  try {
    const searchPayload: Record<string, unknown> = {
      per_page: 10,
      person_titles: [
        "owner",
        "founder",
        "director",
        "managing director",
        "principal",
        "partner",
        "branch manager",
        "sales manager",
        "lettings manager",
      ],
    };

    if (domain) {
      searchPayload.q_organization_domains = domain;
    } else {
      searchPayload.q_keywords = companyName;
    }

    const res = await axios.post(
      `${APOLLO_BASE}/mixed_people/search`,
      searchPayload,
      {
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        timeout: 10000,
      }
    );

    const people: ApolloPerson[] = res.data?.people ?? [];
    for (const p of people) {
      const title = p.title ?? "";
      if (!isTargetTitle(title) && people.length > 3) continue; // filter if plenty of results

      contacts.push({
        name: [p.first_name, p.last_name].filter(Boolean).join(" "),
        title,
        email: p.email,
        linkedin_url: p.linkedin_url,
        phone: p.phone_numbers?.[0]?.raw_number,
      });
    }
  } catch {
    // People search failed — return org data only
  }

  return {
    place_id: placeId,
    linkedin_url: org.linkedin_url,
    employee_count: org.estimated_num_employees,
    founded_year: org.founded_year,
    description: org.short_description,
    contacts,
  };
}
