/**
 * CVio — POST /api/linkedin/compare
 * Compares a resume against a LinkedIn profile (URL or PDF export).
 * Returns a ComparisonResult, or 422 if the LinkedIn source is inaccessible/unparseable.
 *
 * Protected by withAuth middleware (Firebase ID token required).
 *
 * Requirements: 7.1, 7.2, 7.3, 7.5
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../../lib/services/authService";
import { compareWithLinkedIn } from "../../../../lib/services/linkedInComparator";
import type { ResumeData } from "../../../../types/resume";

interface CompareBody {
  data?: ResumeData;
  source?: {
    type: "url" | "pdf";
    value: string;
  };
}

export const POST = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  let body: CompareBody;
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

  if (!body.source || !body.source.type || !body.source.value) {
    return NextResponse.json(
      { error: "Missing required field: source ({ type, value })" },
      { status: 400 }
    );
  }

  // For PDF type, decode base64 string to Buffer
  const source =
    body.source.type === "pdf"
      ? { type: "pdf" as const, value: Buffer.from(body.source.value, "base64") }
      : { type: "url" as const, value: body.source.value };

  const result = await compareWithLinkedIn(body.data, source);

  // If the comparator returned an error, the LinkedIn source was inaccessible
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result, { status: 200 });
});
