/**
 * CVio — POST /api/optimize
 * Accepts a JSON body with a ResumeData object, runs full AI optimization,
 * and returns an OptimizationResult.
 *
 * Protected by withAuth middleware (Firebase ID token required).
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../lib/services/authService";
import { optimizeResume } from "../../../lib/services/aiOptimizer";
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

  const result = await optimizeResume(body.data);
  return NextResponse.json(result, { status: 200 });
});
