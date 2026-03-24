export interface AgencyInfo {
  name: string;
  address: string;
  postcode: string;
  lat?: number;
  lng?: number;
  website: string;
}

export interface Competitor {
  place_id: string;
  name: string;
  address: string;
  website?: string;
  phone?: string;
  rating?: number;
  user_ratings_total?: number;
  lat: number;
  lng: number;
  distance_km?: number;
  // Apollo enrichment
  enriched?: boolean;
  enriching?: boolean;
  linkedin_url?: string;
  employee_count?: number;
  founded_year?: number;
  description?: string;
  contacts?: Contact[];
}

export interface Contact {
  name: string;
  title: string;
  email?: string;
  linkedin_url?: string;
  phone?: string;
}

export interface AnalyzeRequest {
  url: string;
  radius_km?: number;
}

export interface AnalyzeResponse {
  agency: AgencyInfo;
  competitors: Competitor[];
  error?: string;
}

export interface EnrichRequest {
  domain: string;
  company_name: string;
  place_id: string;
}

export interface EnrichResponse {
  place_id: string;
  linkedin_url?: string;
  employee_count?: number;
  founded_year?: number;
  description?: string;
  contacts: Contact[];
  error?: string;
}
