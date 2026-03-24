"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  onSearch: (url: string, radiusKm: number, postcode?: string) => void;
  loading: boolean;
  highlightPostcode?: boolean;
  initialUrl?: string;
}

export default function SearchForm({ onSearch, loading, highlightPostcode, initialUrl }: Props) {
  const [url, setUrl] = useState("");
  const [radius, setRadius] = useState(5);
  const [postcode, setPostcode] = useState("");
  const postcodeRef = useRef<HTMLInputElement>(null);

  // Pre-fill URL when returned from a needs_postcode response
  useEffect(() => {
    if (initialUrl) setUrl(initialUrl);
  }, [initialUrl]);

  // Auto-focus + scroll to postcode field when needed
  useEffect(() => {
    if (highlightPostcode && postcodeRef.current) {
      postcodeRef.current.focus();
      postcodeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightPostcode]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    onSearch(url.trim(), radius, postcode.trim() || undefined);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
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
          <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">
            Postcode{" "}
            {highlightPostcode ? (
              <span className="text-amber-600 font-semibold">— required</span>
            ) : (
              <span className="text-gray-400 font-normal">(optional)</span>
            )}
          </label>
          <input
            id="postcode"
            ref={postcodeRef}
            type="text"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder="e.g. SW1A 1AA"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm shadow-sm outline-none transition focus:ring-2 ${
              highlightPostcode
                ? "border-amber-400 bg-amber-50 focus:border-amber-500 focus:ring-amber-200"
                : "border-gray-300 focus:border-brand-500 focus:ring-brand-200"
            }`}
            disabled={loading}
          />
          <p className="text-xs text-gray-400 mt-1">
            {highlightPostcode ? "Enter the agency's postcode to continue" : "Fill in if auto-detection fails"}
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="radius" className="block text-sm font-medium text-gray-700 mb-1">
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
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
