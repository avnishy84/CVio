"use client";

/**
 * CVio — DropZone component
 * Drag-and-drop / click-to-browse file upload with glassmorphism styling.
 * Enforces PDF/DOCX and 10 MB client-side before POSTing to /api/upload.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { ParseResult } from "@/types/resume";

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const ACCEPTED_EXTENSIONS = ".pdf,.docx";

// ── Types ────────────────────────────────────────────────────────────────────

type UploadState = "idle" | "dragover" | "uploading" | "success" | "error";

export interface DropZoneProps {
  onUploadComplete: (result: ParseResult) => void;
  idToken?: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function validateFile(file: File): string | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
    return "Only PDF and DOCX files are accepted.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File exceeds the 10 MB size limit.";
  }
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DropZone({ onUploadComplete }: DropZoneProps) {
  const { idToken } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // ── Upload logic ────────────────────────────────────────────────────────

  const uploadFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setErrorMessage(validationError);
        setUploadState("error");
        return;
      }

      setFileName(file.name);
      setErrorMessage(null);
      setUploadState("uploading");

      try {
        const formData = new FormData();
        formData.append("file", file);

        const headers: HeadersInit = {};
        if (idToken) {
          headers["Authorization"] = `Bearer ${idToken}`;
        }

        const response = await fetch("/api/upload", {
          method: "POST",
          headers,
          body: formData,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ?? `Upload failed (${response.status})`
          );
        }

        const result: ParseResult = await response.json();
        setUploadState("success");
        onUploadComplete(result);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Upload failed. Please try again.");
        setUploadState("error");
      }
    },
    [idToken, onUploadComplete]
  );

  // ── Drag-and-drop handlers ──────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState("dragover");
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState("idle");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setUploadState("idle");

      const file = e.dataTransfer.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
      // Reset so the same file can be re-selected after an error
      e.target.value = "";
    },
    [uploadFile]
  );

  const handleClick = useCallback(() => {
    if (uploadState !== "uploading") {
      inputRef.current?.click();
    }
  }, [uploadState]);

  const handleReset = useCallback(() => {
    setUploadState("idle");
    setErrorMessage(null);
    setFileName(null);
  }, []);

  // ── Derived styles ──────────────────────────────────────────────────────

  const isDragOver = uploadState === "dragover";
  const isUploading = uploadState === "uploading";
  const isSuccess = uploadState === "success";
  const isError = uploadState === "error";

  const borderColor = isDragOver
    ? "border-purple-400"
    : isSuccess
    ? "border-emerald-400"
    : isError
    ? "border-red-400"
    : "border-white/20";

  const bgColor = isDragOver
    ? "bg-purple-500/20"
    : isSuccess
    ? "bg-emerald-500/10"
    : isError
    ? "bg-red-500/10"
    : "bg-white/10";

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload your resume — drag and drop or click to browse"
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" || e.key === " " ? handleClick() : undefined}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        "relative flex flex-col items-center justify-center gap-4",
        "w-full min-h-[260px] p-8 rounded-2xl cursor-pointer",
        "backdrop-blur-xl border transition-all duration-300 select-none",
        "focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent",
        bgColor,
        borderColor,
        isDragOver ? "scale-[1.02]" : "scale-100",
        isUploading ? "cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={handleInputChange}
        aria-hidden="true"
      />

      {/* Icon */}
      <div
        className={[
          "flex items-center justify-center w-16 h-16 rounded-full transition-colors duration-300",
          isDragOver ? "bg-purple-500/30" : isSuccess ? "bg-emerald-500/20" : isError ? "bg-red-500/20" : "bg-white/10",
        ].join(" ")}
      >
        {isUploading ? (
          // Spinner
          <svg
            className="w-8 h-8 text-purple-300 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : isSuccess ? (
          // Checkmark
          <svg
            className="w-8 h-8 text-emerald-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : isError ? (
          // Error X
          <svg
            className="w-8 h-8 text-red-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          // Cloud upload icon
          <svg
            className={["w-8 h-8 transition-colors duration-300", isDragOver ? "text-purple-300" : "text-white/60"].join(" ")}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338-2.32 5.75 5.75 0 0 1 1.548 11.095H6.75Z"
            />
          </svg>
        )}
      </div>

      {/* Text content */}
      <div className="flex flex-col items-center gap-1 text-center">
        {isUploading ? (
          <>
            <p className="text-white font-medium text-base">Uploading {fileName}…</p>
            <p className="text-white/50 text-sm">Parsing your resume with CVio AI</p>
          </>
        ) : isSuccess ? (
          <>
            <p className="text-emerald-300 font-medium text-base">Upload complete</p>
            <p className="text-white/50 text-sm">{fileName}</p>
          </>
        ) : isError ? (
          <>
            <p className="text-red-300 font-medium text-base">Upload failed</p>
            <p className="text-red-300/80 text-sm">{errorMessage}</p>
          </>
        ) : isDragOver ? (
          <>
            <p className="text-purple-200 font-medium text-base">Drop your file here</p>
            <p className="text-white/50 text-sm">PDF or DOCX · max 10 MB</p>
          </>
        ) : (
          <>
            <p className="text-white font-medium text-base">
              Drag &amp; drop your resume, or{" "}
              <span className="text-purple-300 underline underline-offset-2">browse</span>
            </p>
            <p className="text-white/50 text-sm">PDF or DOCX · max 10 MB</p>
          </>
        )}
      </div>

      {/* Try again button after error */}
      {isError && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleReset();
          }}
          className="mt-1 px-4 py-1.5 rounded-lg text-sm font-medium text-white/80 bg-white/10 hover:bg-white/20 border border-white/20 transition-colors duration-200"
        >
          Try again
        </button>
      )}

      {/* Upload another after success */}
      {isSuccess && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleReset();
          }}
          className="mt-1 px-4 py-1.5 rounded-lg text-sm font-medium text-white/80 bg-white/10 hover:bg-white/20 border border-white/20 transition-colors duration-200"
        >
          Upload another
        </button>
      )}
    </div>
  );
}
