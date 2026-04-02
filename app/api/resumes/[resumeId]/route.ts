/**
 * CVio — DELETE /api/resumes/[resumeId]
 * Deletes a resume and all its versions from Firestore.
 *
 * Protected by withAuth middleware (Firebase ID token required).
 *
 * Requirements: 11.5
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../../lib/services/authService";
import { deleteResume } from "../../../../lib/services/versionStore";

export const DELETE = withAuth(
  async (_req: NextRequest, context: { params: { resumeId: string } }, user): Promise<NextResponse> => {
    const { resumeId } = context.params;

    if (!resumeId) {
      return NextResponse.json({ error: "Missing resumeId" }, { status: 400 });
    }

    await deleteResume(user.uid, resumeId);
    return NextResponse.json({ success: true }, { status: 200 });
  }
);
