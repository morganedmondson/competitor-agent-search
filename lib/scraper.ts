import axios from "axios";
import * as cheerio from "cheerio";
import type { AgencyInfo } from "@/types";

const UK_POSTCODE_RE =
  /\b([A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2})\b/gi;

function normalisePostcode(raw: string): string {
  const clean = raw.replace(/\s+/g, "").toUpperCase();
  return clean.slice(0, -3) + " " + clean.slice(-3);
}

function extractPostcode(text: string): string | null {
  const matches = text.match(UK_POSTCODE_RE);
  if (matches && matches.length > 0) {
    return normalisePostcode(matches[0]);
  }
  return null;
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function scrapeAgency(rawUrl: string): Promise<AgencyInfo> {
  const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  const domain = extractDomain(url);

  let html = "";
  try {
    const res = await axios.get(url, {
      timeout: 12000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NestiCompetitorBot/1.0; +https://nesti.co.uk)",
      },
      maxRedirects: 5,
    });
    html = res.data as string;
  } catch {
    // If we can't fetch, return a minimal stub with just the domain
    return {
      name: domain,
      address: "",
      postcode: "",
      website: url,
    };
  }

  const $ = cheerio.load(html);

  // --- Agency name ---
  let name =
    $('meta[property="og:site_name"]').attr("content") ||
    $('meta[name="application-name"]').attr("content") ||
    $("title").first().text().split("|")[0].split("-")[0].trim() ||
    domain;

  name = name.trim();

  // --- Address / postcode from JSON-LD schema.org ---
  let address = "";
  let postcode = "";

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || "{}");
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const addr = item.address || item?.location?.address;
        if (addr) {
          if (typeof addr === "string") {
            address = address || addr;
            postcode = postcode || extractPostcode(addr) || "";
          } else if (typeof addr === "object") {
            const parts = [
              addr.streetAddress,
              addr.addressLocality,
              addr.postalCode,
              addr.addressRegion,
            ]
              .filter(Boolean)
              .join(", ");
            address = address || parts;
            postcode =
              postcode || addr.postalCode || extractPostcode(parts) || "";
          }
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });

  // --- Fallback: scan visible text for a UK postcode ---
  if (!postcode) {
    // Check common footer/contact selectors
    const contactSelectors = [
      "footer",
      "#footer",
      ".footer",
      "#contact",
      ".contact",
      '[class*="contact"]',
      '[class*="address"]',
      '[id*="address"]',
      ".branch",
      '[class*="branch"]',
    ];
    for (const sel of contactSelectors) {
      const text = $(sel).text();
      const found = extractPostcode(text);
      if (found) {
        postcode = found;
        address = address || text.replace(/\s+/g, " ").trim().slice(0, 200);
        break;
      }
    }
  }

  // Last resort: scan entire body text
  if (!postcode) {
    const bodyText = $("body").text();
    postcode = extractPostcode(bodyText) || "";
  }

  return {
    name,
    address: address.replace(/\s+/g, " ").trim(),
    postcode,
    website: url,
  };
}
