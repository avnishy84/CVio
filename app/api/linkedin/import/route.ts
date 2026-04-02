/**
 * CVio — POST /api/linkedin/import
 * Imports selected fields from LinkedIn data into the current ResumeData.
 * Returns the updated ResumeData.
 *
 * Protected by withAuth middleware (Firebase ID token required).
 *
 * Requirements: 7.4
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../../lib/services/authService";
import { importLinkedInFields } from "../../../../lib/services/linkedInComparator";
import type { ResumeData } from "../../../../types/resume";

interface ImportBody {
  data?: ResumeData;
  linkedInData?: Partial<ResumeData>;
  selectedFields?: (keyof ResumeData)[];
}

export const POST = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  let body: ImportBody;
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

  if (!body.linkedInData) {
    return NextResponse.json(
      { error: "Missing required field: linkedInData" },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.selectedFields) || body.selectedFields.length === 0) {
    return NextResponse.json(
      { error: "Missing required field: selectedFields (non-empty array)" },
      { status: 400 }
    );
  }

  const updated = importLinkedInFields(body.data, body.linkedInData, body.selectedFields);
  return NextResponse.json(updated, { status: 200 });
});
