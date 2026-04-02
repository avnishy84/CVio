"use client";

/**
 * CVio — TemplateSelector
 * Renders three template option buttons; calls onSelect without mutating ResumeData.
 * Requirements: 8.4
 */

import React from "react";

export interface TemplateSelectorProps {
  selected: string;
  onSelect: (template: string) => void;
}

const TEMPLATES = [
  { id: "notion", label: "Notion", description: "Clean & minimal" },
  { id: "apple", label: "Apple", description: "Elegant & spacious" },
  { id: "ats-friendly", label: "ATS-Friendly", description: "Plain & compatible" },
] as const;

export default function TemplateSelector({ selected, onSelect }: TemplateSelectorProps) {
  return (
    <div
      className="template-selector"
      style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}
      role="group"
      aria-label="Resume template selection"
    >
      {TEMPLATES.map((tpl) => {
        const isActive = selected === tpl.id;
        return (
          <button
            key={tpl.id}
            onClick={() => onSelect(tpl.id)}
            aria-pressed={isActive}
            style={{
              padding: "10px 20px",
              border: isActive ? "2px solid #0071e3" : "2px solid #d2d2d7",
              borderRadius: "8px",
              background: isActive ? "#e8f0fe" : "#ffffff",
              color: isActive ? "#0071e3" : "#1d1d1f",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "0.9rem",
              fontWeight: isActive ? "600" : "400",
              transition: "all 0.15s",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              minWidth: "110px",
            }}
          >
            <span>{tpl.label}</span>
            <span style={{ fontSize: "0.75rem", color: isActive ? "#0071e3" : "#6e6e73", fontWeight: "400" }}>
              {tpl.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
