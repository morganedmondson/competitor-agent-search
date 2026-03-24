import axios from "axios";
import type { AgencyInfo, Competitor } from "@/types";

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";
const GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode";

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodePostcode(
  postcode: string,
  apiKey: string
): Promise<{ lat: number; lng: number } | null> {
  const res = await axios.get(`${GEOCODE_BASE}/json`, {
    params: { address: postcode + ", UK", key: apiKey },
  });
  const results = res.data?.results;
  if (!results?.length) return null;
  return results[0].geometry.location as { lat: number; lng: number };
}

async function nearbySearch(
  lat: number,
  lng: number,
  radiusM: number,
  keyword: string,
  apiKey: string,
  pagetoken?: string
): Promise<{ results: PlaceResult[]; next_page_token?: string }> {
  const params: Record<string, string | number> = {
    location: `${lat},${lng}`,
    radius: radiusM,
    keyword,
    type: "real_estate_agency",
    key: apiKey,
  };
  if (pagetoken) params.pagetoken = pagetoken;

  const res = await axios.get(`${PLACES_BASE}/nearbysearch/json`, { params });
  return {
    results: res.data?.results ?? [],
    next_page_token: res.data?.next_page_token,
  };
}

async function getPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<{ website?: string; phone?: string }> {
  try {
    const res = await axios.get(`${PLACES_BASE}/details/json`, {
      params: {
        place_id: placeId,
        fields: "website,formatted_phone_number",
        key: apiKey,
      },
    });
    const r = res.data?.result ?? {};
    return {
      website: r.website,
      phone: r.formatted_phone_number,
    };
  } catch {
    return {};
  }
}

interface PlaceResult {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  geometry: { location: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  website?: string;
}

export async function findCompetitors(
  agency: AgencyInfo,
  radiusKm: number = 5
): Promise<Competitor[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is not set");

  // Geocode the postcode if we don't already have coordinates
  let lat = agency.lat;
  let lng = agency.lng;

  if (!lat || !lng) {
    if (!agency.postcode) {
      throw new Error(
        "Could not determine location from the agency website. Please check the URL and try again."
      );
    }
    const coords = await geocodePostcode(agency.postcode, apiKey);
    if (!coords) {
      throw new Error(
        `Could not geocode postcode "${agency.postcode}". Please verify the agency's website has a valid UK postcode.`
      );
    }
    lat = coords.lat;
    lng = coords.lng;
  }

  agency.lat = lat;
  agency.lng = lng;

  const radiusM = radiusKm * 1000;
  const seenIds = new Set<string>();
  const allPlaces: PlaceResult[] = [];

  // Search for both "estate agents" and "letting agents"
  for (const keyword of ["estate agents", "letting agents"]) {
    let { results, next_page_token } = await nearbySearch(
      lat,
      lng,
      radiusM,
      keyword,
      apiKey
    );
    allPlaces.push(...results);

    // Google allows up to 2 more pages (max 60 results total per keyword)
    let pages = 0;
    while (next_page_token && pages < 2) {
      // Google requires a short delay before using a page token
      await new Promise((r) => setTimeout(r, 2000));
      ({ results, next_page_token } = await nearbySearch(
        lat,
        lng,
        radiusM,
        keyword,
        apiKey,
        next_page_token
      ));
      allPlaces.push(...results);
      pages++;
    }
  }

  // Deduplicate by place_id and filter out the original agency
  const agencyNameLower = agency.name.toLowerCase();
  const competitors: Competitor[] = [];

  for (const place of allPlaces) {
    if (seenIds.has(place.place_id)) continue;
    seenIds.add(place.place_id);

    // Skip if it looks like the same agency
    const placeName = place.name.toLowerCase();
    if (
      placeName === agencyNameLower ||
      placeName.includes(agencyNameLower) ||
      agencyNameLower.includes(placeName)
    ) {
      continue;
    }

    const pLat = place.geometry.location.lat;
    const pLng = place.geometry.location.lng;

    competitors.push({
      place_id: place.place_id,
      name: place.name,
      address: place.vicinity || place.formatted_address || "",
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      lat: pLat,
      lng: pLng,
      distance_km: parseFloat(haversineKm(lat!, lng!, pLat, pLng).toFixed(2)),
    });
  }

  // Sort by distance
  competitors.sort((a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99));

  // Fetch website + phone details for top 30 (to keep API calls reasonable)
  const topCompetitors = competitors.slice(0, 30);
  await Promise.allSettled(
    topCompetitors.map(async (c) => {
      const details = await getPlaceDetails(c.place_id, apiKey);
      c.website = details.website;
      c.phone = details.phone;
    })
  );

  return topCompetitors;
}
