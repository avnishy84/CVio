"use client";

/**
 * CVio — SideBySideView
 * Renders original and optimized ResumeData side by side using the active template.
 * Highlights fields that differ between the two versions.
 * Requirements: 8.1, 8.2
 */

import React, { useMemo } from "react";
import type { ResumeData } from "../../types/resume";
import NotionTemplate from "../builder/templates/NotionTemplate";
import AppleTemplate from "../builder/templates/AppleTemplate";
import ATSFriendlyTemplate from "../builder/templates/ATSFriendlyTemplate";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SideBySideViewProps {
  original: ResumeData;
  optimized: ResumeData;
  template?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively compare two values; returns true if they differ. */
function isDifferent(a: unknown, b: unknown): boolean {
  if (a === b) return false;
  if (typeof a !== typeof b) return true;
  if (a === null || b === null) return a !== b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return true;
    return a.some((item, i) => isDifferent(item, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    if (keysA.length !== keysB.length) return true;
    return keysA.some((k) =>
      isDifferent((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
    );
  }
  return a !== b;
}

/** Top-level ResumeData sections that are meaningful to diff. */
const DIFF_SECTIONS: (keyof ResumeData)[] = [
  "personal_info",
  "summary",
  "skills",
  "experience",
  "projects",
  "education",
];

// ---------------------------------------------------------------------------
// Template renderer
// ---------------------------------------------------------------------------

function renderTemplate(data: ResumeData, template: string) {
  switch (template) {
    case "apple":
      return <AppleTemplate data={data} />;
    case "ats-friendly":
      return <ATSFriendlyTemplate data={data} />;
    case "notion":
    default:
      return <NotionTemplate data={data} />;
  }
}

// ---------------------------------------------------------------------------
// SideBySideView
// ---------------------------------------------------------------------------

export default function SideBySideView({
  original,
  optimized,
  template = "notion",
}: SideBySideViewProps) {
  const changedSections = useMemo<Set<keyof ResumeData>>(() => {
    const changed = new Set<keyof ResumeData>();
    DIFF_SECTIONS.forEach((key) => {
      if (isDifferent(original[key], optimized[key])) changed.add(key);
    });
    return changed;
  }, [original, optimized]);

  const changeCount = changedSections.size;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "16px",
        padding: "20px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "1rem",
            fontWeight: "700",
            color: "#f9fafb",
          }}
        >
          Side-by-Side Comparison
        </h2>

        {/* Change count badge */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 12px",
            borderRadius: "20px",
            fontSize: "0.8rem",
            fontWeight: "600",
            background:
              changeCount === 0
                ? "rgba(107,114,128,0.2)"
                : "rgba(245,158,11,0.2)",
            color: changeCount === 0 ? "#9ca3af" : "#f59e0b",
            border: `1px solid ${changeCount === 0 ? "rgba(107,114,128,0.3)" : "rgba(245,158,11,0.3)"}`,
          }}
        >
          {changeCount === 0
            ? "No changes"
            : `${changeCount} section${changeCount !== 1 ? "s" : ""} changed`}
        </span>
      </div>

      {/* Changed sections legend */}
      {changeCount > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            marginBottom: "16px",
          }}
        >
          {Array.from(changedSections).map((section) => (
            <span
              key={section}
              style={{
                padding: "2px 10px",
                borderRadius: "12px",
                fontSize: "0.75rem",
                fontWeight: "600",
                background: "rgba(245,158,11,0.15)",
                color: "#f59e0b",
                border: "1px solid rgba(245,158,11,0.25)",
              }}
            >
              {section.replace("_", " ")}
            </span>
          ))}
        </div>
      )}

      {/* Two-column layout */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          alignItems: "flex-start",
          overflowX: "auto",
        }}
      >
        {/* Original column */}
        <div
          style={{
            flex: "1 1 0",
            minWidth: "320px",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              fontWeight: "700",
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#9ca3af",
              background: "rgba(107,114,128,0.1)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            Original
          </div>
          <div style={{ background: "#fff" }}>
            {renderTemplate(original, template)}
          </div>
        </div>

        {/* Optimized column */}
        <div
          style={{
            flex: "1 1 0",
            minWidth: "320px",
            border: `1px solid ${changeCount > 0 ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              fontWeight: "700",
              fontSize: "0.85rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#34d399",
              background: "rgba(5,150,105,0.1)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            Optimized
          </div>
          <div style={{ background: "#fff" }}>
            {renderTemplate(optimized, template)}
          </div>
        </div>
      </div>
    </div>
  );
}
