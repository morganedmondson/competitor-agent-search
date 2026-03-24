import axios from "axios";
import * as cheerio from "cheerio";
import Anthropic from "@anthropic-ai/sdk";
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

/**
 * Ask Claude to extract the agency name and UK postcode from page text.
 * Used as a fallback when regex scraping can't find a postcode.
 */
async function extractWithClaude(
  pageText: string,
  domain: string
): Promise<{ name: string; postcode: string; address: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { name: domain, postcode: "", address: "" };

  const client = new Anthropic({ apiKey });

  // Truncate to ~8k chars to keep cost low — plenty for finding an address
  const excerpt = pageText.replace(/\s+/g, " ").trim().slice(0, 8000);

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 256,
      system:
        "You are a data extraction assistant. Extract information from estate/letting agency websites. Reply with ONLY a JSON object — no markdown, no explanation.",
      messages: [
        {
          role: "user",
          content: `From this estate/letting agency website text, extract:
1. The agency's name
2. Their UK postcode (format: "SW1A 1AA")
3. Their full address (if available)

If you cannot find a UK postcode, return an empty string for postcode.

Website text:
${excerpt}

Reply with ONLY this JSON (no markdown):
{"name": "...", "postcode": "...", "address": "..."}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.trim());

    return {
      name: parsed.name || domain,
      postcode: parsed.postcode
        ? normalisePostcode(parsed.postcode)
        : "",
      address: parsed.address || "",
    };
  } catch {
    return { name: domain, postcode: "", address: "" };
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
    return { name: domain, address: "", postcode: "", website: url };
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

  // Scan entire body text
  if (!postcode) {
    const bodyText = $("body").text();
    postcode = extractPostcode(bodyText) || "";
  }

  // --- Claude fallback: if still no postcode, ask Claude to extract it ---
  if (!postcode) {
    const bodyText = $("body").text();
    const claudeResult = await extractWithClaude(bodyText, domain);
    if (claudeResult.postcode) postcode = claudeResult.postcode;
    if (claudeResult.address && !address) address = claudeResult.address;
    // Use Claude's name only if the title-based one is just the domain
    if (claudeResult.name && name === domain) name = claudeResult.name;
  }

  return {
    name,
    address: address.replace(/\s+/g, " ").trim(),
    postcode,
    website: url,
  };
}
