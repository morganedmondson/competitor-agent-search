"use client";

import { useState } from "react";
import SearchForm from "@/components/SearchForm";
import ResultsTable from "@/components/ResultsTable";
import type { AgencyInfo, Competitor, AnalyzeResponse } from "@/types";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agency, setAgency] = useState<AgencyInfo | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());

  async function handleSearch(url: string, radiusKm: number) {
    setLoading(true);
    setError(null);
    setAgency(null);
    setCompetitors([]);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, radius_km: radiusKm }),
      });

      const data: AnalyzeResponse & { error?: string } = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      setAgency(data.agency);
      setCompetitors(data.competitors);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnrich(competitor: Competitor) {
    setEnrichingIds((prev) => new Set(prev).add(competitor.place_id));

    try {
      const domain = competitor.website
        ? competitor.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]
        : "";

      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          company_name: competitor.name,
          place_id: competitor.place_id,
        }),
      });

      const data = await res.json();

      setCompetitors((prev) =>
        prev.map((c) =>
          c.place_id === competitor.place_id
            ? {
                ...c,
                enriched: true,
                linkedin_url: data.linkedin_url,
                employee_count: data.employee_count,
                founded_year: data.founded_year,
                description: data.description,
                contacts: data.contacts ?? [],
              }
            : c
        )
      );
    } catch {
      // Silently fail — button will reappear
    } finally {
      setEnrichingIds((prev) => {
        const next = new Set(prev);
        next.delete(competitor.place_id);
        return next;
      });
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <span className="font-bold text-gray-900">Nesti</span>
              <span className="ml-2 text-sm text-gray-500">
                Competitor Targeting
              </span>
            </div>
          </div>
          <span className="text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full font-medium border border-brand-100">
            Internal Tool
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Search card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h1 className="text-lg font-semibold text-gray-900 mb-1">
            Find local competitors
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Paste a customer&apos;s agency website URL. We&apos;ll extract their
            location and find nearby estate &amp; letting agencies your sales
            team can target.
          </p>
          <SearchForm onSearch={handleSearch} loading={loading} />
        </div>

        {/* Error state */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        {/* Agency info banner */}
        {agency && (
          <div className="bg-brand-50 border border-brand-100 rounded-xl px-5 py-4">
            <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-2">
              Customer agency detected
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>
                <span className="text-gray-500">Name:</span>{" "}
                <span className="font-medium text-gray-900">{agency.name}</span>
              </span>
              {agency.postcode && (
                <span>
                  <span className="text-gray-500">Postcode:</span>{" "}
                  <span className="font-medium text-gray-900">
                    {agency.postcode}
                  </span>
                </span>
              )}
              {agency.address && (
                <span>
                  <span className="text-gray-500">Address:</span>{" "}
                  <span className="font-medium text-gray-900 line-clamp-1">
                    {agency.address}
                  </span>
                </span>
              )}
              <a
                href={agency.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline text-xs mt-0.5"
              >
                {agency.website}
              </a>
            </div>
          </div>
        )}

        {/* Results */}
        {competitors.length > 0 && (
          <ResultsTable
            competitors={competitors}
            onEnrich={handleEnrich}
            enrichingIds={enrichingIds}
          />
        )}

        {/* Empty state after search */}
        {!loading && agency && competitors.length === 0 && !error && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No competitors found in this area. Try increasing the search radius.
          </div>
        )}
      </main>
    </div>
  );
}
