"use client";

/**
 * CVio — ResumeBuilder
 * Orchestrates template rendering, inline editing, and section regeneration.
 * Uses useReducer for ResumeData state.
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import React, { useReducer } from "react";
import type { ResumeData } from "../../types/resume";
import TemplateSelector from "./TemplateSelector";
import SectionEditor from "./SectionEditor";
import NotionTemplate from "./templates/NotionTemplate";
import AppleTemplate from "./templates/AppleTemplate";
import ATSFriendlyTemplate from "./templates/ATSFriendlyTemplate";

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export type BuilderAction =
  | { type: "UPDATE_FIELD"; section: keyof ResumeData; value: unknown }
  | { type: "SWITCH_TEMPLATE"; template: string }
  | { type: "REGENERATE_SECTION"; section: keyof ResumeData; content: unknown };

export interface BuilderState {
  data: ResumeData;
  template: string;
  regenerating: Partial<Record<keyof ResumeData, boolean>>;
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "UPDATE_FIELD":
      return {
        ...state,
        data: {
          ...state.data,
          [action.section]: action.value,
          updatedAt: new Date().toISOString(),
        },
      };

    case "SWITCH_TEMPLATE":
      // Data is never touched — only the active template changes
      return {
        ...state,
        template: action.template,
      };

    case "REGENERATE_SECTION":
      return {
        ...state,
        data: {
          ...state.data,
          [action.section]: action.content,
          updatedAt: new Date().toISOString(),
        },
        regenerating: {
          ...state.regenerating,
          [action.section]: false,
        },
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface ResumeBuilderProps {
  initialData: ResumeData;
  idToken?: string | null;
}

export default function ResumeBuilder({ initialData, idToken }: ResumeBuilderProps) {
  const [state, dispatch] = useReducer(builderReducer, {
    data: initialData,
    template: "notion",
    regenerating: {},
  });

  const { data, template, regenerating } = state;

  // Regenerate a single section via POST /api/optimize/section
  async function handleRegenerate(section: keyof ResumeData) {
    const content = data[section];
    try {
      const res = await fetch("/api/optimize/section", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ section, content }),
      });
      if (res.ok) {
        const json = await res.json();
        dispatch({ type: "REGENERATE_SECTION", section, content: json.content });
      }
    } catch {
      // Silently ignore network errors — data stays unchanged
    }
  }

  // Render the active template
  function renderTemplate() {
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

  // Editable sections (string-valued top-level fields)
  const editableSections: (keyof ResumeData)[] = ["summary", "skills", "experience", "education", "projects", "personal_info"];

  return (
    <div className="resume-builder" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Template switcher */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <span style={{ fontWeight: "600", fontSize: "0.9rem", color: "#1d1d1f" }}>Template:</span>
        <TemplateSelector
          selected={template}
          onSelect={(t) => dispatch({ type: "SWITCH_TEMPLATE", template: t })}
        />
      </div>

      {/* Section regeneration controls */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {editableSections.map((section) => (
          <button
            key={section}
            onClick={() => handleRegenerate(section)}
            disabled={!!regenerating[section]}
            style={{
              padding: "4px 10px",
              fontSize: "0.8rem",
              border: "1px solid #d2d2d7",
              borderRadius: "4px",
              background: "#f5f5f7",
              cursor: "pointer",
              color: "#1d1d1f",
            }}
          >
            {regenerating[section] ? "Regenerating…" : `↺ ${section}`}
          </button>
        ))}
      </div>

      {/* Inline-editable template preview */}
      <div style={{ border: "1px solid #e5e5ea", borderRadius: "12px", overflow: "hidden" }}>
        {editableSections.map((section) => (
          <SectionEditor
            key={section}
            section={section}
            value={data[section]}
            onUpdate={(value) => dispatch({ type: "UPDATE_FIELD", section, value })}
          >
            {/* Children are rendered as a no-op placeholder; the template renders the full view */}
            <span />
          </SectionEditor>
        ))}
        {renderTemplate()}
      </div>
    </div>
  );
}
