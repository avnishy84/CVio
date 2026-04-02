/**
 * CVio — POST /api/optimize/section
 * Accepts a JSON body with a section key and its content, runs single-section
 * AI optimization, and returns the rewritten section value.
 *
 * Protected by withAuth middleware (Firebase ID token required).
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../../lib/services/authService";
import { optimizeSection } from "../../../../lib/services/aiOptimizer";
import type { ResumeData } from "../../../../types/resume";

export const POST = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  let body: { section?: keyof ResumeData; content?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.section) {
    return NextResponse.json(
      { error: "Missing required field: section" },
      { status: 400 }
    );
  }

  if (body.content === undefined) {
    return NextResponse.json(
      { error: "Missing required field: content" },
      { status: 400 }
    );
  }

  const result = await optimizeSection(body.section, body.content);
  return NextResponse.json({ section: body.section, content: result }, { status: 200 });
});
