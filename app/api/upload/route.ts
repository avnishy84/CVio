/**
 * CVio — POST /api/upload
 * Accepts a multipart/form-data request with a "file" field.
 * Enforces 10 MB size limit and PDF/DOCX MIME type check before
 * passing the buffer to the Parser service.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { NextRequest, NextResponse } from "next/server";
import { parseResume } from "../../../lib/services/parser";

// 10 MB in bytes
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10,485,760 bytes

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

function isAcceptedMimeType(mime: string): mime is AcceptedMimeType {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(mime);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart/form-data request" },
      { status: 400 }
    );
  }

  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided. Include a file field in the form data." },
      { status: 400 }
    );
  }

  // Requirement 1.2 — reject files exceeding 10 MB
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File exceeds 10 MB limit" },
      { status: 413 }
    );
  }

  // Requirement 1.1, 1.3 — reject unsupported MIME types
  if (!isAcceptedMimeType(file.type)) {
    return NextResponse.json(
      { error: "Accepted formats: PDF, DOCX" },
      { status: 415 }
    );
  }

  // Requirement 1.4 — pass buffer to Parser
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const result = await parseResume(buffer, file.type);

  return NextResponse.json(result, { status: 200 });
}
