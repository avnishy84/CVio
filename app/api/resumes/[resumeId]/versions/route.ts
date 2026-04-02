/**
 * CVio — GET /api/resumes/[resumeId]/versions
 * Lists all versions for a resume, ordered by timestamp descending.
 *
 * Protected by withAuth middleware (Firebase ID token required).
 *
 * Requirements: 11.2, 11.4
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../../../lib/services/authService";
import { listVersions } from "../../../../../lib/services/versionStore";

export const GET = withAuth(
  async (_req: NextRequest, context: { params: { resumeId: string } }, user): Promise<NextResponse> => {
    const { resumeId } = context.params;

    if (!resumeId) {
      return NextResponse.json({ error: "Missing resumeId" }, { status: 400 });
    }

    const versions = await listVersions(user.uid, resumeId);
    return NextResponse.json(versions, { status: 200 });
  }
);
