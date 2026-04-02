"use client";

/**
 * CVio — BrandingPanel
 * Displays tone badge, summary score, UVP flag, and headline/tagline/narrative suggestions.
 * Calls POST /api/branding with current ResumeData.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { ResumeData, BrandingResult } from "@/types/resume";

interface BrandingPanelProps {
  data: ResumeData;
}

const TONE_COLORS: Record<BrandingResult["tone"], string> = {
  formal: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  technical: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  creative: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  neutral: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full transition-colors ${
            i < score ? "bg-indigo-400" : "bg-white/15"
          }`}
        />
      ))}
      <span className="ml-2 text-sm font-semibold text-white">{score}/10</span>
    </div>
  );
}

function SuggestionList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-widest text-white/50">{title}</h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="text-sm text-white/75 bg-white/5 rounded-xl px-4 py-3 border border-white/5"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BrandingPanel({ data }: BrandingPanelProps) {
  const { idToken } = useAuth();
  const [result, setResult] = useState<BrandingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!idToken) {
      setError("You must be signed in to analyze your resume.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/branding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `Request failed (${res.status})`);
      }
      const json: BrandingResult = await res.json();
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 space-y-6">
      <h2 className="text-lg font-semibold text-white">Personal Branding</h2>

      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 transition-colors"
      >
        {loading ? "Analyzing…" : "Analyze Branding"}
      </button>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-6">
          {/* Tone badge + summary score */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs text-white/50 mb-1.5">Tone</p>
              <span
                className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border capitalize ${TONE_COLORS[result.tone]}`}
              >
                {result.tone}
              </span>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-1.5">Summary Score</p>
              <ScoreDots score={result.summaryScore} />
            </div>
          </div>

          {/* UVP flag */}
          <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${result.hasUniqueValueProposition ? "border-green-500/30 bg-green-500/10" : "border-yellow-500/30 bg-yellow-500/10"}`}>
            <span className="text-lg mt-0.5">
              {result.hasUniqueValueProposition ? "✅" : "⚠️"}
            </span>
            <div>
              <p className="text-sm font-medium text-white">
                {result.hasUniqueValueProposition
                  ? "Unique Value Proposition detected"
                  : "No clear Unique Value Proposition"}
              </p>
              {result.uvpSuggestion && (
                <p className="text-sm text-white/60 mt-1">{result.uvpSuggestion}</p>
              )}
            </div>
          </div>

          {/* Suggestions */}
          <SuggestionList title="Headline Ideas" items={result.headlines} />
          <SuggestionList title="Tagline Ideas" items={result.taglines} />
          <SuggestionList title="Career Narratives" items={result.careerNarratives} />
        </div>
      )}
    </div>
  );
}
