"use client";

/**
 * CVio — Builder Page
 * Main resume editing view. Loads resume data, renders ResumeBuilder with analysis
 * panels, side-by-side comparison, export menu, and version history sidebar.
 * Auto-saves on change with a 2-second debounce.
 * Requirements: 8.1, 8.2, 8.3, 8.4, 11.1, 11.3
 */

import { useEffect, useRef, useState, useCallback } from "react";
import Head from "next/head";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import ResumeBuilder from "@/components/builder/ResumeBuilder";
import ATSScorePanel from "@/components/analysis/ATSScorePanel";
import BrandingPanel from "@/components/analysis/BrandingPanel";
import LinkedInPanel from "@/components/analysis/LinkedInPanel";
import SideBySideView from "@/components/comparison/SideBySideView";
import ExportMenu from "@/components/export/ExportMenu";
import type { ResumeData, ResumeVersion } from "@/types/resume";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Inner page content (rendered inside AuthGuard)
// ---------------------------------------------------------------------------

function BuilderContent({ resumeId }: { resumeId: string }) {
  const { idToken } = useAuth();

  // Resume data state
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [originalData, setOriginalData] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Version history
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

  // Auto-save
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  // ---------------------------------------------------------------------------
  // Load latest version on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!idToken) return;

    async function loadLatestVersion() {
      setLoading(true);
      setFetchError(null);
      try {
        // 1. Fetch version list
        const listRes = await fetch(`/api/resumes/${resumeId}/versions`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!listRes.ok) {
          const json = await listRes.json().catch(() => ({}));
          throw new Error(json.error ?? `Failed to load versions (${listRes.status})`);
        }
        const versionList: ResumeVersion[] = await listRes.json();
        setVersions(versionList);

        if (versionList.length === 0) {
          throw new Error("No versions found for this resume.");
        }

        // 2. Load the most recent version (first in list — ordered desc)
        const latest = versionList[0];
        const versionRes = await fetch(
          `/api/resumes/${resumeId}/versions/${latest.versionId}`,
          { headers: { Authorization: `Bearer ${idToken}` } }
        );
        if (!versionRes.ok) {
          const json = await versionRes.json().catch(() => ({}));
          throw new Error(json.error ?? `Failed to load version (${versionRes.status})`);
        }
        const version: ResumeVersion = await versionRes.json();
        setResumeData(version.data);
        setOriginalData(version.data);
        setActiveVersionId(latest.versionId);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Failed to load resume.");
      } finally {
        setLoading(false);
        isFirstLoad.current = false;
      }
    }

    loadLatestVersion();
  }, [idToken, resumeId]);

  // ---------------------------------------------------------------------------
  // Load version history sidebar
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!idToken) return;

    async function fetchVersions() {
      setVersionsLoading(true);
      try {
        const res = await fetch(`/api/resumes/${resumeId}/versions`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) {
          const list: ResumeVersion[] = await res.json();
          setVersions(list);
        }
      } catch {
        // Non-critical — sidebar just stays empty
      } finally {
        setVersionsLoading(false);
      }
    }

    fetchVersions();
  }, [idToken, resumeId]);

  // ---------------------------------------------------------------------------
  // Load a specific version from the sidebar
  // ---------------------------------------------------------------------------

  async function handleLoadVersion(versionId: string) {
    if (!idToken || versionId === activeVersionId) return;
    try {
      const res = await fetch(
        `/api/resumes/${resumeId}/versions/${versionId}`,
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      if (!res.ok) return;
      const version: ResumeVersion = await res.json();
      setResumeData(version.data);
      setActiveVersionId(versionId);
      setSaveStatus("idle");
      // Cancel any pending debounce
      if (debounceRef.current) clearTimeout(debounceRef.current);
    } catch {
      // Silently ignore
    }
  }

  // ---------------------------------------------------------------------------
  // Auto-save with 2-second debounce
  // ---------------------------------------------------------------------------

  const saveResume = useCallback(
    async (data: ResumeData) => {
      if (!idToken) return;
      setSaveStatus("saving");
      try {
        const res = await fetch("/api/resumes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ resumeId, data }),
        });
        if (!res.ok) throw new Error("Save failed");
        setSaveStatus("saved");
        // Refresh version list after save
        const listRes = await fetch(`/api/resumes/${resumeId}/versions`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (listRes.ok) {
          const list: ResumeVersion[] = await listRes.json();
          setVersions(list);
        }
        // Reset "saved" indicator after 3 seconds
        setTimeout(() => setSaveStatus("idle"), 3000);
      } catch {
        setSaveStatus("error");
      }
    },
    [idToken, resumeId]
  );

  // Trigger debounced save whenever resumeData changes (skip initial load)
  useEffect(() => {
    if (isFirstLoad.current || !resumeData) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveResume(resumeData);
    }, 2000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [resumeData, saveResume]);

  // ---------------------------------------------------------------------------
  // LinkedIn import handler
  // ---------------------------------------------------------------------------

  function handleLinkedInImport(updatedData: ResumeData) {
    setResumeData(updatedData);
  }

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-purple-400 border-t-transparent animate-spin" />
          <p className="text-white/70 text-sm">Loading your resume…</p>
        </div>
      </div>
    );
  }

  if (fetchError || !resumeData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-md p-8 max-w-md w-full text-center space-y-4">
          <p className="text-2xl">⚠️</p>
          <h2 className="text-white font-semibold text-lg">Resume not found</h2>
          <p className="text-white/60 text-sm">{fetchError ?? "Could not load resume data."}</p>
          <a
            href="/dashboard"
            className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main layout
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-900/70 backdrop-blur-md px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <a
            href="/dashboard"
            className="text-white/50 hover:text-white text-sm transition-colors"
          >
            ← Dashboard
          </a>
          <span className="text-white/20">/</span>
          <span className="text-white/80 text-sm font-medium truncate max-w-[200px]">
            Resume{" "}
            <span className="font-mono text-purple-300 text-xs">
              {resumeId.slice(0, 8)}…
            </span>
          </span>
        </div>

        {/* Save status indicator */}
        <div className="flex items-center gap-2 text-sm">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-white/50">
              <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-transparent animate-spin" />
              Saving…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 text-green-400">
              <span>✓</span> Saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-red-400">Save failed</span>
          )}
        </div>
      </header>

      {/* Two-column layout */}
      <div className="flex gap-0 max-w-screen-2xl mx-auto">
        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 px-6 py-8 space-y-8">
          {/* Resume Builder */}
          <section
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6"
            aria-label="Resume Builder"
          >
            <h2 className="text-lg font-semibold text-white mb-4">Resume Builder</h2>
            <ResumeBuilder
              initialData={resumeData}
              idToken={idToken}
            />
          </section>

          {/* Analysis panels */}
          <section aria-label="ATS Score Analysis">
            <ATSScorePanel data={resumeData} />
          </section>

          <section aria-label="Personal Branding Analysis">
            <BrandingPanel data={resumeData} />
          </section>

          <section aria-label="LinkedIn Comparison">
            <LinkedInPanel data={resumeData} onImport={handleLinkedInImport} />
          </section>

          {/* Side-by-side comparison */}
          {originalData && (
            <section aria-label="Side-by-Side Comparison">
              <SideBySideView original={originalData} optimized={resumeData} />
            </section>
          )}

          {/* Export */}
          <section aria-label="Export Resume" className="pb-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Export</h2>
              <ExportMenu data={resumeData} />
            </div>
          </section>
        </main>

        {/* ── Version history sidebar ── */}
        <aside
          className="w-72 shrink-0 border-l border-white/10 bg-white/3 backdrop-blur-md px-4 py-8 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto"
          aria-label="Version History"
        >
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest mb-4">
            Version History
          </h2>

          {versionsLoading && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
            </div>
          )}

          {!versionsLoading && versions.length === 0 && (
            <p className="text-white/40 text-xs text-center py-8">No versions saved yet.</p>
          )}

          {!versionsLoading && versions.length > 0 && (
            <ul className="space-y-2">
              {versions.map((v) => {
                const isActive = v.versionId === activeVersionId;
                return (
                  <li key={v.versionId}>
                    <button
                      onClick={() => handleLoadVersion(v.versionId)}
                      className={`w-full text-left rounded-xl px-3 py-3 border transition-colors ${
                        isActive
                          ? "border-purple-500/50 bg-purple-500/15 text-white"
                          : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">
                          v{v.versionNumber}
                        </span>
                        {isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/30 text-purple-300 font-medium">
                            current
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/40 mt-0.5">
                        {formatTimestamp(v.timestamp)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export — wrapped in AuthGuard
// ---------------------------------------------------------------------------

export default function BuilderPage({
  params,
}: {
  params: { resumeId: string };
}) {
  return (
    <>
      <Head>
        <title>Build Your Resume | CVio</title>
        <meta
          name="description"
          content="Build and optimize your resume with CVio — AI-powered ATS scoring, branding analysis, and one-click export."
        />
        <meta property="og:title" content="Build Your Resume | CVio" />
        <meta
          property="og:description"
          content="Build and optimize your resume with CVio — AI-powered ATS scoring, branding analysis, and one-click export."
        />
        <meta property="og:site_name" content="CVio" />
      </Head>
      <AuthGuard>
        <BuilderContent resumeId={params.resumeId} />
      </AuthGuard>
    </>
  );
}
