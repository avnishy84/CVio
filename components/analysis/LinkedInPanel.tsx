"use client";

/**
 * CVio — LinkedInPanel
 * Shows inconsistencies between resume and LinkedIn profile with priority badges,
 * resume/LinkedIn suggestion columns, and field import checkboxes.
 * Calls POST /api/linkedin/compare and POST /api/linkedin/import.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { ResumeData, ComparisonResult, Inconsistency } from "@/types/resume";

interface LinkedInPanelProps {
  data: ResumeData;
  onImport: (updatedData: ResumeData) => void;
}

const PRIORITY_STYLES: Record<Inconsistency["priority"], string> = {
  high: "bg-red-500/20 text-red-300 border-red-500/30",
  medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

export default function LinkedInPanel({ data, onImport }: LinkedInPanelProps) {
  const { idToken } = useAuth();

  // Compare state
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  // Import state — maps field name → linkedin value for checked fields
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  async function handleCompare() {
    if (!idToken) {
      setCompareError("You must be signed in.");
      return;
    }
    if (!linkedInUrl.trim()) {
      setCompareError("Please enter a LinkedIn profile URL.");
      return;
    }
    setCompareLoading(true);
    setCompareError(null);
    setComparison(null);
    setSelectedFields(new Set());
    try {
      const res = await fetch("/api/linkedin/compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          data,
          source: { type: "url", value: linkedInUrl.trim() },
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `Request failed (${res.status})`);
      }
      const json: ComparisonResult = await res.json();
      setComparison(json);
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCompareLoading(false);
    }
  }

  function toggleField(field: string) {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  }

  async function handleImport() {
    if (!idToken || !comparison || selectedFields.size === 0) return;
    setImportLoading(true);
    setImportError(null);

    // Build linkedInData from the inconsistencies for selected fields
    const linkedInData: Partial<ResumeData> = {};
    for (const inc of comparison.inconsistencies) {
      if (selectedFields.has(inc.field)) {
        // Map simple top-level field names; complex fields are passed as-is
        (linkedInData as Record<string, unknown>)[inc.field] = inc.linkedInValue;
      }
    }

    try {
      const res = await fetch("/api/linkedin/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          data,
          linkedInData,
          selectedFields: Array.from(selectedFields),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `Request failed (${res.status})`);
      }
      const updated: ResumeData = await res.json();
      onImport(updated);
      setSelectedFields(new Set());
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 space-y-6">
      <h2 className="text-lg font-semibold text-white">LinkedIn Comparison</h2>

      {/* URL input */}
      <div className="space-y-2">
        <label className="text-sm text-white/70">LinkedIn Profile URL</label>
        <input
          type="url"
          value={linkedInUrl}
          onChange={(e) => setLinkedInUrl(e.target.value)}
          placeholder="https://www.linkedin.com/in/your-profile"
          className="w-full rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <button
        onClick={handleCompare}
        disabled={compareLoading}
        className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 transition-colors"
      >
        {compareLoading ? "Comparing…" : "Compare with LinkedIn"}
      </button>

      {compareError && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {compareError}
        </p>
      )}

      {comparison && (
        <div className="space-y-6">
          {/* Inconsistencies */}
          {comparison.inconsistencies.length === 0 ? (
            <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
              No inconsistencies found — your resume and LinkedIn profile are in sync.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white/80">
                  Inconsistencies ({comparison.inconsistencies.length})
                </h3>
                <button
                  onClick={() =>
                    setSelectedFields(
                      new Set(comparison.inconsistencies.map((i) => i.field))
                    )
                  }
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Select all
                </button>
              </div>

              <div className="space-y-2">
                {comparison.inconsistencies.map((inc, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.has(inc.field)}
                      onChange={() => toggleField(inc.field)}
                      className="mt-1 accent-indigo-500"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white capitalize">
                          {inc.field.replace(/_/g, " ")}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_STYLES[inc.priority]}`}
                        >
                          {inc.priority}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="space-y-0.5">
                          <p className="text-white/40 uppercase tracking-wider">Resume</p>
                          <p className="text-white/70 truncate">{inc.resumeValue || "—"}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-white/40 uppercase tracking-wider">LinkedIn</p>
                          <p className="text-indigo-300 truncate">{inc.linkedInValue || "—"}</p>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {selectedFields.size > 0 && (
                <div className="space-y-2">
                  {importError && (
                    <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                      {importError}
                    </p>
                  )}
                  <button
                    onClick={handleImport}
                    disabled={importLoading}
                    className="w-full rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 transition-colors"
                  >
                    {importLoading
                      ? "Importing…"
                      : `Import ${selectedFields.size} field${selectedFields.size > 1 ? "s" : ""} from LinkedIn`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Suggestions columns */}
          {(comparison.resumeSuggestions.length > 0 ||
            comparison.linkedInSuggestions.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {comparison.resumeSuggestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-white/50">
                    Resume Suggestions
                  </h4>
                  <ul className="space-y-2">
                    {comparison.resumeSuggestions.map((s, i) => (
                      <li
                        key={i}
                        className="text-sm text-white/70 bg-white/5 rounded-xl px-3 py-2 border border-white/5"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {comparison.linkedInSuggestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-white/50">
                    LinkedIn Suggestions
                  </h4>
                  <ul className="space-y-2">
                    {comparison.linkedInSuggestions.map((s, i) => (
                      <li
                        key={i}
                        className="text-sm text-white/70 bg-white/5 rounded-xl px-3 py-2 border border-white/5"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
