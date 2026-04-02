import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  padding?: string;
}

export default function GlassCard({ children, className, padding = "p-6" }: GlassCardProps) {
  const base = "backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl";
  const classes = [base, padding, className].filter(Boolean).join(" ");

  return <div className={classes}>{children}</div>;
}
