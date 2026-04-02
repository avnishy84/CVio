"use client";

/**
 * CVio — ATSScorePanel
 * Displays ATS score ring, per-category breakdown bars, and improvement suggestions.
 * Calls POST /api/ats-score with current ResumeData and optional job description.
 *
 * Requirements: 4.1, 4.3, 4.4
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { ResumeData, ATSResult } from "@/types/resume";

interface ATSScorePanelProps {
  data: ResumeData;
}

const CATEGORY_LABELS: Record<keyof ATSResult["breakdown"], string> = {
  keywordMatch: "Keyword Match",
  formattingReadability: "Formatting & Readability",
  sectionCompleteness: "Section Completeness",
  impactMetrics: "Impact & Metrics",
  skillsRelevance: "Skills Relevance",
  experienceDepth: "Experience Depth",
};

const CATEGORY_MAX: Record<keyof ATSResult["breakdown"], number> = {
  keywordMatch: 30,
  formattingReadability: 20,
  sectionCompleteness: 15,
  impactMetrics: 15,
  skillsRelevance: 10,
  experienceDepth: 10,
};

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color =
    score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140" className="rotate-[-90deg]">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="12"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold text-white">{score}</span>
        <span className="text-xs text-white/60 uppercase tracking-widest">ATS Score</span>
      </div>
    </div>
  );
}

export default function ATSScorePanel({ data }: ATSScorePanelProps) {
  const { idToken } = useAuth();
  const [result, setResult] = useState<ATSResult | null>(null);
  const [jobDescription, setJobDescription] = useState("");
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
      const res = await fetch("/api/ats-score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          data,
          jobDescription: jobDescription.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `Request failed (${res.status})`);
      }
      const json: ATSResult = await res.json();
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 space-y-6">
      <h2 className="text-lg font-semibold text-white">ATS Score</h2>

      {/* Job description input */}
      <div className="space-y-2">
        <label className="text-sm text-white/70">
          Job Description{" "}
          <span className="text-white/40">(optional — improves keyword matching)</span>
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={3}
          placeholder="Paste the job description here…"
          className="w-full rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 text-sm px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 transition-colors"
      >
        {loading ? "Analyzing…" : "Analyze ATS Score"}
      </button>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-6">
          {/* Score ring */}
          <div className="flex justify-center relative">
            <ScoreRing score={result.score} />
          </div>

          {result.keywordMatchingSkipped && (
            <p className="text-xs text-white/50 text-center">
              Keyword matching skipped — no job description provided.
            </p>
          )}

          {/* Breakdown bars */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white/80">Category Breakdown</h3>
            {(Object.keys(CATEGORY_LABELS) as (keyof ATSResult["breakdown"])[]).map((key) => {
              const value = result.breakdown[key];
              const max = CATEGORY_MAX[key];
              const pct = (value / max) * 100;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs text-white/60">
                    <span>{CATEGORY_LABELS[key]}</span>
                    <span>
                      {value}/{max}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white/80">Suggestions</h3>
              <ul className="space-y-2">
                {result.suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm text-white/70 bg-white/5 rounded-xl px-4 py-3"
                  >
                    <span className="text-indigo-400 mt-0.5">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
