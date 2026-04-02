"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function HomeNav() {
  const { currentUser, loading } = useAuth();

  return (
    <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
      <span className="text-2xl font-bold tracking-tight">CVio</span>
      <div className="flex items-center gap-3">
        {loading ? (
          <div className="w-20 h-8 rounded-xl bg-white/10 animate-pulse" />
        ) : currentUser ? (
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold transition-colors"
          >
            Go to Dashboard →
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold transition-colors"
            >
              Get started free
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
