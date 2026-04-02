/**
 * CVio — POST /api/ats-score
 * Accepts a JSON body with a ResumeData object and an optional job description,
 * runs ATS scoring, and returns an ATSResult.
 *
 * Protected by withAuth middleware (Firebase ID token required).
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../lib/services/authService";
import { scoreResume } from "../../../lib/services/atsScorer";
import type { ResumeData } from "../../../types/resume";

export const POST = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  let body: { data?: ResumeData; jobDescription?: string };
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

  const result = scoreResume(body.data, body.jobDescription);
  return NextResponse.json(result, { status: 200 });
});
