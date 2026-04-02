"use client";

/**
 * CVio — ExportMenu
 * PDF and DOCX download buttons. POSTs to export routes and triggers browser download.
 * Requirements: 9.1, 9.2
 */

import React, { useState } from "react";
import type { ResumeData } from "../../types/resume";
import { useAuth } from "../../contexts/AuthContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportMenuProps {
  data: ResumeData;
  template?: string;
}

type ExportFormat = "pdf" | "docx";

interface ExportState {
  loading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function triggerDownload(
  blob: Blob,
  filename: string
): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// ExportMenu
// ---------------------------------------------------------------------------

export default function ExportMenu({ data, template = "notion" }: ExportMenuProps) {
  const { idToken } = useAuth();

  const [pdfState, setPdfState] = useState<ExportState>({ loading: false, error: null });
  const [docxState, setDocxState] = useState<ExportState>({ loading: false, error: null });

  async function handleExport(format: ExportFormat) {
    const setState = format === "pdf" ? setPdfState : setDocxState;
    setState({ loading: true, error: null });

    try {
      const body =
        format === "pdf"
          ? JSON.stringify({ data, template })
          : JSON.stringify({ data });

      const res = await fetch(`/api/export/${format}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body,
      });

      if (!res.ok) {
        let message = `Export failed (${res.status})`;
        try {
          const json = await res.json();
          if (json?.error) message = json.error;
        } catch {
          // ignore JSON parse errors
        }
        setState({ loading: false, error: message });
        return;
      }

      const blob = await res.blob();
      const name = data.personal_info?.name?.replace(/\s+/g, "_") ?? "resume";
      const filename = `${name}_cvio.${format}`;
      await triggerDownload(blob, filename);
      setState({ loading: false, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setState({ loading: false, error: message });
    }
  }

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.07)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: "14px",
        padding: "20px 24px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        display: "inline-flex",
        flexDirection: "column",
        gap: "12px",
        minWidth: "220px",
      }}
    >
      <span
        style={{
          fontSize: "0.75rem",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        Export CVio Resume
      </span>

      {/* PDF button */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <button
          onClick={() => handleExport("pdf")}
          disabled={pdfState.loading || docxState.loading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "10px 20px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.18)",
            background: pdfState.loading
              ? "rgba(239,68,68,0.15)"
              : "rgba(239,68,68,0.22)",
            color: "#fca5a5",
            fontWeight: "600",
            fontSize: "0.9rem",
            cursor: pdfState.loading || docxState.loading ? "not-allowed" : "pointer",
            opacity: docxState.loading ? 0.5 : 1,
            transition: "background 0.2s, opacity 0.2s",
          }}
          aria-label="Download PDF"
        >
          {pdfState.loading ? (
            <>
              <Spinner />
              Generating PDF…
            </>
          ) : (
            <>
              <PdfIcon />
              Download PDF
            </>
          )}
        </button>
        {pdfState.error && (
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              color: "#f87171",
              padding: "4px 8px",
              background: "rgba(239,68,68,0.1)",
              borderRadius: "6px",
            }}
            role="alert"
          >
            {pdfState.error}
          </p>
        )}
      </div>

      {/* DOCX button */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <button
          onClick={() => handleExport("docx")}
          disabled={pdfState.loading || docxState.loading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "10px 20px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.18)",
            background: docxState.loading
              ? "rgba(59,130,246,0.15)"
              : "rgba(59,130,246,0.22)",
            color: "#93c5fd",
            fontWeight: "600",
            fontSize: "0.9rem",
            cursor: pdfState.loading || docxState.loading ? "not-allowed" : "pointer",
            opacity: pdfState.loading ? 0.5 : 1,
            transition: "background 0.2s, opacity 0.2s",
          }}
          aria-label="Download DOCX"
        >
          {docxState.loading ? (
            <>
              <Spinner />
              Generating DOCX…
            </>
          ) : (
            <>
              <DocxIcon />
              Download DOCX
            </>
          )}
        </button>
        {docxState.error && (
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              color: "#93c5fd",
              padding: "4px 8px",
              background: "rgba(59,130,246,0.1)",
              borderRadius: "6px",
            }}
            role="alert"
          >
            {docxState.error}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Micro icons
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: "spin 0.8s linear infinite" }}
      aria-hidden="true"
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}

function DocxIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
