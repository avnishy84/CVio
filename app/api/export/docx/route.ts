/**
 * CVio — POST /api/export/docx
 * Exports a ResumeData object to a DOCX file using the docx library.
 * Returns the binary DOCX buffer with Content-Disposition: attachment.
 *
 * Protected by withAuth middleware (Firebase ID token required).
 *
 * Requirements: 9.2, 9.3, 9.4
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../../lib/services/authService";
import { exportToDOCX } from "../../../../lib/services/exporter";
import type { ResumeData } from "../../../../types/resume";

interface ExportDOCXBody {
  data?: ResumeData;
}

export const POST = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  let body: ExportDOCXBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.data) {
    return NextResponse.json(
      { error: "Missing required field: data (ResumeData)" },
      { status: 400 }
    );
  }

  const result = await exportToDOCX(body.data);

  return new Response(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": result.mimeType,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Content-Length": String(result.buffer.length),
    },
  }) as unknown as NextResponse;
});
