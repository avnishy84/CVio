/**
 * CVio — GET /api/resumes (list all resumes for user)
 *        POST /api/resumes (save a new version)
 *
 * GET: Queries /users/{userId}/resumes collection in Firestore and returns metadata.
 * POST: Accepts { resumeId, data } and calls saveVersion.
 *
 * Protected by withAuth middleware (Firebase ID token required).
 *
 * Requirements: 11.1, 11.2, 11.5
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../lib/services/authService";
import { saveVersion } from "../../../lib/services/versionStore";
import { adminDb } from "../../../lib/firebaseAdmin";
import type { ResumeData } from "../../../types/resume";

export const GET = withAuth(async (_req: NextRequest, _ctx: unknown, user): Promise<NextResponse> => {
  const db = adminDb();
  const snap = await db
    .collection("users")
    .doc(user.uid)
    .collection("resumes")
    .orderBy("updatedAt", "desc")
    .get();

  const resumes = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      resumeId: doc.id,
      updatedAt: d.updatedAt?.toDate?.()?.toISOString() ?? d.updatedAt ?? null,
      latestVersionNumber: d.latestVersionNumber ?? null,
    };
  });

  return NextResponse.json(resumes, { status: 200 });
});

export const POST = withAuth(async (req: NextRequest, _ctx: unknown, user): Promise<NextResponse> => {
  let body: { resumeId?: string; data?: ResumeData };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.resumeId) {
    return NextResponse.json(
      { error: "Missing required field: resumeId" },
      { status: 400 }
    );
  }

  if (!body.data) {
    return NextResponse.json(
      { error: "Missing required field: data (ResumeData)" },
      { status: 400 }
    );
  }

  const version = await saveVersion(user.uid, body.resumeId, body.data);
  return NextResponse.json(version, { status: 201 });
});
