"use client";

import { useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import DropZone from "@/components/upload/DropZone";
import { useAuth } from "@/contexts/AuthContext";
import type { ParseResult } from "@/types/resume";
import crypto from "crypto";

function UploadContent() {
  const router = useRouter();
  const { idToken } = useAuth();

  async function handleUploadComplete(result: ParseResult) {
    // Save the parsed resume as a new version in Firestore
    const resumeId = result.data.resumeId || crypto.randomUUID();
    try {
      if (idToken) {
        await fetch("/api/resumes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ resumeId, data: { ...result.data, resumeId } }),
        });
      }
    } catch {
      // non-critical — still navigate to builder
    }
    router.push(`/builder/${resumeId}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">Upload your resume</h1>
          <p className="text-white/55 text-sm mt-2">
            PDF or DOCX · max 10 MB · CVio will parse and optimize it with AI
          </p>
        </div>
        <DropZone onUploadComplete={handleUploadComplete} />
        <p className="text-center mt-6">
          <a href="/dashboard" className="text-white/40 hover:text-white/70 text-sm transition-colors">
            ← Back to Dashboard
          </a>
        </p>
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <AuthGuard>
      <UploadContent />
    </AuthGuard>
  );
}
