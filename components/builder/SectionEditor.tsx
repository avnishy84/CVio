"use client";

/**
 * CVio — SectionEditor
 * Inline-editable wrapper that dispatches field-update actions to the parent reducer.
 * Requirements: 8.2
 */

import React, { ReactNode } from "react";
import type { ResumeData } from "../../types/resume";

export interface SectionEditorProps {
  section: keyof ResumeData;
  value: unknown;
  onUpdate: (value: unknown) => void;
  children: ReactNode;
}

export default function SectionEditor({ children, onUpdate, section, value }: SectionEditorProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<string>(() =>
    typeof value === "string" ? value : JSON.stringify(value ?? "")
  );

  // Sync draft when value changes externally
  React.useEffect(() => {
    if (!editing) {
      setDraft(typeof value === "string" ? value : JSON.stringify(value ?? ""));
    }
  }, [value, editing]);

  function handleSave() {
    // For string fields pass the string directly; for others attempt JSON parse
    if (typeof value === "string") {
      onUpdate(draft);
    } else {
      try {
        onUpdate(JSON.parse(draft));
      } catch {
        onUpdate(draft);
      }
    }
    setEditing(false);
  }

  function handleCancel() {
    setDraft(typeof value === "string" ? value : JSON.stringify(value ?? ""));
    setEditing(false);
  }

  return (
    <div
      className="section-editor"
      data-section={section}
      style={{ position: "relative" }}
    >
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            style={{
              width: "100%",
              padding: "8px",
              border: "2px solid #0071e3",
              borderRadius: "6px",
              fontFamily: "inherit",
              fontSize: "inherit",
              resize: "vertical",
              outline: "none",
            }}
            autoFocus
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleSave}
              style={{
                padding: "4px 12px",
                background: "#0071e3",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              style={{
                padding: "4px 12px",
                background: "transparent",
                color: "#6e6e73",
                border: "1px solid #d2d2d7",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setEditing(true)}
          title="Click to edit"
          style={{
            cursor: "text",
            borderRadius: "4px",
            padding: "2px",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "rgba(0,113,227,0.05)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "transparent";
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
