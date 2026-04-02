/**
 * CVio — GET /api/resumes/[resumeId]/versions/[versionId]
 * Retrieves a specific version of a resume by versionId.
 *
 * Protected by withAuth middleware (Firebase ID token required).
 *
 * Requirements: 11.3
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../../../../lib/services/authService";
import { getVersion } from "../../../../../../lib/services/versionStore";

export const GET = withAuth(
  async (
    _req: NextRequest,
    context: { params: { resumeId: string; versionId: string } },
    user
  ): Promise<NextResponse> => {
    const { resumeId, versionId } = context.params;

    if (!resumeId || !versionId) {
      return NextResponse.json({ error: "Missing resumeId or versionId" }, { status: 400 });
    }

    try {
      const version = await getVersion(user.uid, resumeId, versionId);
      return NextResponse.json(version, { status: 200 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Version not found";
      if (message.includes("not found")) {
        return NextResponse.json({ error: message }, { status: 404 });
      }
      return NextResponse.json({ error: "Failed to retrieve version" }, { status: 500 });
    }
  }
);
