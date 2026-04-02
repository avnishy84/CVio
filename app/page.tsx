import Link from "next/link";
import type { Metadata } from "next";
import HomeNav from "@/components/HomeNav";
import HeroCTA from "@/components/HeroCTA";

export const metadata: Metadata = {
  title: "CVio — AI Resume Builder & ATS Optimizer",
  description:
    "CVio helps you build, optimize, and tailor your resume with AI. Get instant ATS scores, personal branding insights, and one-click export.",
  openGraph: {
    title: "CVio — AI Resume Builder & ATS Optimizer",
    description:
      "Build and optimize your resume with CVio. AI-powered ATS scoring, role tailoring, and one-click PDF/DOCX export.",
    siteName: "CVio",
  },
};

const FEATURES = [
  { icon: "📄", title: "Smart Resume Parsing", desc: "Upload PDF or DOCX and CVio extracts every section instantly." },
  { icon: "🎯", title: "ATS Score & Breakdown", desc: "See exactly how your resume performs against applicant tracking systems." },
  { icon: "✨", title: "AI Optimization", desc: "GPT-4o rewrites your content with strong action verbs and quantified impact." },
  { icon: "🎭", title: "Role-Based Tailoring", desc: "Tailor your CV for Software Dev, Product Manager, Designer, HR, or Marketing." },
  { icon: "🔗", title: "LinkedIn Comparison", desc: "Spot inconsistencies between your resume and LinkedIn profile in seconds." },
  { icon: "📤", title: "PDF & DOCX Export", desc: "Download your polished resume in any format, pixel-perfect every time." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Auth-aware nav */}
      <HomeNav />

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-20 pb-16 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-widest mb-6">
          AI-Powered Resume Builder
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-6">
          Land more interviews
          <br />
          <span className="text-purple-400">with CVio</span>
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mb-10">
          Upload your resume, get an instant ATS score, let AI optimize every section, and export a polished PDF or DOCX — all in one place.
        </p>
        <HeroCTA />
      </section>

      {/* Features grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 hover:bg-white/10 transition-colors">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-sm text-white/55">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center px-6 pb-24">
        <div className="inline-block rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-10 py-10 max-w-xl">
          <h2 className="text-2xl font-bold mb-3">Ready to optimize your CV?</h2>
          <p className="text-white/55 text-sm mb-6">
            Create a free account and upload your first resume in under a minute.
          </p>
          <Link href="/register" className="inline-block px-7 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold transition-colors">
            Get started with CVio
          </Link>
        </div>
      </section>

      <footer className="text-center text-white/30 text-xs pb-8">
        © {new Date().getFullYear()} CVio — AI Resume Builder &amp; ATS Optimizer
      </footer>
    </main>
  );
}
