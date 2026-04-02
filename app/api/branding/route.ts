/**
 * CVio — POST /api/branding
 * Accepts a JSON body with a ResumeData object, runs branding analysis,
 * and returns a BrandingResult.
 *
 * Protected by withAuth middleware (Firebase ID token required).
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../lib/services/authService";
import { analyzeBranding } from "../../../lib/services/brandingAnalyzer";
import type { ResumeData } from "../../../types/resume";

export const POST = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  let body: { data?: ResumeData };
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

  const result = await analyzeBranding(body.data);
  return NextResponse.json(result, { status: 200 });
});
