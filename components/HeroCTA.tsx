"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function HeroCTA() {
  const { currentUser, loading } = useAuth();

  if (loading) return <div className="h-12 w-64 rounded-xl bg-white/10 animate-pulse mx-auto" />;

  if (currentUser) {
    return (
      <div className="flex flex-wrap gap-4 justify-center">
        <Link
          href="/dashboard"
          className="px-7 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-base transition-colors shadow-lg shadow-purple-900/40"
        >
          Go to Dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-4 justify-center">
      <Link
        href="/register"
        className="px-7 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-base transition-colors shadow-lg shadow-purple-900/40"
      >
        Start for free →
      </Link>
      <Link
        href="/login"
        className="px-7 py-3 rounded-xl border border-white/20 hover:bg-white/10 font-semibold text-base transition-colors"
      >
        Sign in
      </Link>
    </div>
  );
}
