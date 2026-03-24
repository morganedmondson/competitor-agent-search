"use client";

import { useState } from "react";

interface Props {
  onSearch: (url: string, radiusKm: number) => void;
  loading: boolean;
}

export default function SearchForm({ onSearch, loading }: Props) {
  const [url, setUrl] = useState("");
  const [radius, setRadius] = useState(5);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    onSearch(url.trim(), radius);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="url"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Customer website URL
        </label>
        <input
          id="url"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="e.g. https://smithestateagents.co.uk"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition"
          disabled={loading}
          required
        />
      </div>

      <div>
        <label
          htmlFor="radius"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Search radius:{" "}
          <span className="font-semibold text-brand-600">{radius} km</span>
        </label>
        <input
          id="radius"
          type="range"
          min={1}
          max={20}
          step={1}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-full accent-brand-600"
          disabled={loading}
        />
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>1 km</span>
          <span>20 km</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !url.trim()}
        className="w-full rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
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
            Searching...
          </span>
        ) : (
          "Find Competitors"
        )}
      </button>
    </form>
  );
}
