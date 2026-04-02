/**
 * CVio — POST /api/export/pdf
 * Exports a ResumeData object to a PDF file using Puppeteer.
 * Returns the binary PDF buffer with Content-Disposition: attachment.
 *
 * Protected by withAuth middleware (Firebase ID token required).
 *
 * Requirements: 9.1, 9.3, 9.4
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../../lib/services/authService";
import { exportToPDF } from "../../../../lib/services/exporter";
import type { ResumeData } from "../../../../types/resume";

interface ExportPDFBody {
  data?: ResumeData;
  template?: string;
}

export const POST = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  let body: ExportPDFBody;
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

  const result = await exportToPDF(body.data, body.template ?? "ats-friendly");

  return new Response(result.buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Content-Length": String(result.buffer.length),
    },
  }) as unknown as NextResponse;
});
