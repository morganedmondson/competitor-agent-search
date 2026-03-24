"use client";

import { useState } from "react";
import type { Competitor, Contact } from "@/types";

interface Props {
  competitors: Competitor[];
  onEnrich: (competitor: Competitor) => void;
  enrichingIds: Set<string>;
}

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span className="text-xs text-amber-500 font-medium">
      {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}{" "}
      <span className="text-gray-500">{rating.toFixed(1)}</span>
    </span>
  );
}

function ContactRow({ contact }: { contact: Contact }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-700 py-1 border-b border-gray-100 last:border-0">
      <span className="font-medium text-gray-900 min-w-[140px]">
        {contact.name || "—"}
      </span>
      <span className="text-gray-500 italic min-w-[160px]">
        {contact.title || "—"}
      </span>
      {contact.email && (
        <a
          href={`mailto:${contact.email}`}
          className="text-brand-600 hover:underline"
        >
          {contact.email}
        </a>
      )}
      {contact.phone && (
        <a href={`tel:${contact.phone}`} className="text-gray-600">
          {contact.phone}
        </a>
      )}
      {contact.linkedin_url && (
        <a
          href={contact.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0077B5] hover:underline"
        >
          LinkedIn
        </a>
      )}
    </div>
  );
}

function CompetitorRow({
  competitor,
  index,
  onEnrich,
  enriching,
}: {
  competitor: Competitor;
  index: number;
  onEnrich: () => void;
  enriching: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasEnrichment = competitor.enriched;
  const hasContacts = competitor.contacts && competitor.contacts.length > 0;

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 text-sm text-gray-400 w-8">{index + 1}</td>
        <td className="px-4 py-3">
          <div className="font-medium text-gray-900 text-sm">
            {competitor.name}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{competitor.address}</div>
          {hasEnrichment && competitor.description && (
            <div className="text-xs text-gray-400 mt-1 line-clamp-2">
              {competitor.description}
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
          {competitor.distance_km != null
            ? `${competitor.distance_km} km`
            : "—"}
        </td>
        <td className="px-4 py-3">
          <StarRating rating={competitor.rating} />
          {competitor.user_ratings_total != null && (
            <div className="text-xs text-gray-400">
              {competitor.user_ratings_total.toLocaleString()} reviews
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-sm">
          <div className="flex flex-col gap-1">
            {competitor.website ? (
              <a
                href={competitor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline text-xs truncate max-w-[160px]"
              >
                {competitor.website.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            ) : (
              <span className="text-gray-400 text-xs">No website</span>
            )}
            {competitor.phone && (
              <a
                href={`tel:${competitor.phone}`}
                className="text-gray-600 text-xs hover:underline"
              >
                {competitor.phone}
              </a>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm">
          {hasEnrichment ? (
            <div className="flex flex-col gap-1">
              {hasContacts && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-brand-600 hover:underline text-left"
                >
                  {expanded ? "Hide" : "Show"} {competitor.contacts!.length}{" "}
                  contact{competitor.contacts!.length !== 1 ? "s" : ""}
                </button>
              )}
              {!hasContacts && (
                <span className="text-xs text-gray-400">No contacts found</span>
              )}
              {competitor.employee_count && (
                <span className="text-xs text-gray-500">
                  ~{competitor.employee_count} employees
                </span>
              )}
              {competitor.linkedin_url && (
                <a
                  href={competitor.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0077B5] hover:underline"
                >
                  Company LinkedIn
                </a>
              )}
            </div>
          ) : (
            <button
              onClick={onEnrich}
              disabled={enriching}
              className="rounded-md bg-white border border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {enriching ? (
                <span className="flex items-center gap-1">
                  <svg
                    className="animate-spin h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Enriching...
                </span>
              ) : (
                "Enrich via Apollo"
              )}
            </button>
          )}
        </td>
      </tr>
      {expanded && hasContacts && (
        <tr className="bg-brand-50">
          <td colSpan={6} className="px-8 py-3">
            <div className="space-y-0.5">
              {competitor.contacts!.map((c, i) => (
                <ContactRow key={i} contact={c} />
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function exportToCsv(competitors: Competitor[]) {
  const rows: string[][] = [
    [
      "Name",
      "Address",
      "Distance (km)",
      "Website",
      "Phone",
      "Rating",
      "Reviews",
      "Employees",
      "LinkedIn",
      "Contact Name",
      "Contact Title",
      "Contact Email",
      "Contact Phone",
      "Contact LinkedIn",
    ],
  ];

  for (const c of competitors) {
    const baseRow = [
      c.name,
      c.address,
      c.distance_km?.toString() ?? "",
      c.website ?? "",
      c.phone ?? "",
      c.rating?.toString() ?? "",
      c.user_ratings_total?.toString() ?? "",
      c.employee_count?.toString() ?? "",
      c.linkedin_url ?? "",
    ];

    if (c.contacts && c.contacts.length > 0) {
      for (const contact of c.contacts) {
        rows.push([
          ...baseRow,
          contact.name,
          contact.title,
          contact.email ?? "",
          contact.phone ?? "",
          contact.linkedin_url ?? "",
        ]);
      }
    } else {
      rows.push([...baseRow, "", "", "", "", ""]);
    }
  }

  const csv = rows
    .map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nesti-competitors-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ResultsTable({
  competitors,
  onEnrich,
  enrichingIds,
}: Props) {
  if (competitors.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        No competitors found in this area.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          Found{" "}
          <span className="font-semibold text-gray-900">
            {competitors.length}
          </span>{" "}
          competitor{competitors.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => exportToCsv(competitors)}
          className="flex items-center gap-1.5 rounded-md bg-white border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-8">
                #
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Agency
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Distance
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Rating
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Contact
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Apollo Enrichment
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {competitors.map((c, i) => (
              <CompetitorRow
                key={c.place_id}
                competitor={c}
                index={i}
                onEnrich={() => onEnrich(c)}
                enriching={enrichingIds.has(c.place_id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
