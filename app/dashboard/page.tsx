"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";

interface ResumeListItem {
  resumeId: string;
  updatedAt: string | null;
  latestVersionNumber: number | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Unknown date";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function DashboardContent() {
  const { idToken } = useAuth();
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idToken) return;

    async function fetchResumes() {
      try {
        const res = await fetch("/api/resumes", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) throw new Error("Failed to load resumes");
        const data: ResumeListItem[] = await res.json();
        // Ensure ordering by updatedAt desc (API already does this, but guard client-side too)
        data.sort((a, b) => {
          if (!a.updatedAt) return 1;
          if (!b.updatedAt) return -1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        setResumes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchResumes();
  }, [idToken]);

  async function handleDelete(resumeId: string) {
    if (!idToken) return;
    setDeletingId(resumeId);
    try {
      const res = await fetch(`/api/resumes/${resumeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error("Failed to delete resume");
      setResumes((prev) => prev.filter((r) => r.resumeId !== resumeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">My Resumes</h1>
            <p className="text-white/50 text-sm mt-1">Manage and edit your CVio resumes</p>
          </div>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
          >
            <span>+</span> Upload New Resume
          </Link>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 rounded-full border-4 border-purple-400 border-t-transparent animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && resumes.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl">
              📄
            </div>
            <p className="text-white/60 text-base">No resumes yet.</p>
            <Link
              href="/upload"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
            >
              Upload your first resume
            </Link>
          </div>
        )}

        {/* Resume cards */}
        {!loading && resumes.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {resumes.map((resume) => (
              <li
                key={resume.resumeId}
                className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 hover:bg-white/10 transition-colors"
              >
                <div className="flex flex-col gap-3">
                  {/* Resume ID / name */}
                  <div>
                    <p className="text-white font-semibold text-sm truncate">
                      Resume{" "}
                      <span className="font-mono text-purple-300 text-xs">
                        {resume.resumeId.slice(0, 8)}…
                      </span>
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      Updated {formatDate(resume.updatedAt)}
                      {resume.latestVersionNumber != null && (
                        <> · v{resume.latestVersionNumber}</>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/builder/${resume.resumeId}`}
                      className="flex-1 text-center px-3 py-2 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-medium transition-colors"
                    >
                      Open in Builder
                    </Link>
                    <button
                      onClick={() => handleDelete(resume.resumeId)}
                      disabled={deletingId === resume.resumeId}
                      aria-label={`Delete resume ${resume.resumeId}`}
                      className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === resume.resumeId ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <Head>
        <title>Dashboard | CVio</title>
        <meta name="description" content="Manage your CVio resumes — AI-powered ATS resume builder and optimizer." />
        <meta property="og:title" content="Dashboard | CVio" />
        <meta property="og:description" content="Manage your CVio resumes — AI-powered ATS resume builder and optimizer." />
        <meta property="og:site_name" content="CVio" />
      </Head>
      <AuthGuard>
        <DashboardContent />
      </AuthGuard>
    </>
  );
}
