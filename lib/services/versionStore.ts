// CVio — Version Store Service
// Persists and retrieves historical versions of a user's resumes using Firestore.
// Requirements: 11.1, 11.2, 11.3, 11.4, 11.5

import { adminDb } from "../firebaseAdmin";
import type { ResumeData, ResumeVersion } from "../../types/resume";

// Firestore schema:
//   /users/{userId}/resumes/{resumeId}/versions/{versionId}

/**
 * Saves a new version of a resume for the given user.
 * Auto-increments versionNumber based on the current maximum.
 * All versions are retained (no cap).
 *
 * Requirements: 11.1
 */
export async function saveVersion(
  userId: string,
  resumeId: string,
  data: ResumeData
): Promise<ResumeVersion> {
  const db = adminDb();
  const versionsRef = db
    .collection("users")
    .doc(userId)
    .collection("resumes")
    .doc(resumeId)
    .collection("versions");

  // Determine the next versionNumber by querying the current maximum
  const latestSnap = await versionsRef
    .orderBy("versionNumber", "desc")
    .limit(1)
    .get();

  const nextVersionNumber =
    latestSnap.empty ? 1 : (latestSnap.docs[0].data().versionNumber as number) + 1;

  const timestamp = new Date();
  const docRef = versionsRef.doc(); // auto-generated versionId

  const versionDoc = {
    resumeId,
    userId,
    data,
    timestamp,
    versionNumber: nextVersionNumber,
  };

  await docRef.set(versionDoc);

  // Also upsert the resume-level metadata document for dashboard ordering
  const resumeRef = db
    .collection("users")
    .doc(userId)
    .collection("resumes")
    .doc(resumeId);

  await resumeRef.set(
    {
      updatedAt: timestamp,
      latestVersionNumber: nextVersionNumber,
    },
    { merge: true }
  );

  return {
    versionId: docRef.id,
    resumeId,
    userId,
    data,
    timestamp,
    versionNumber: nextVersionNumber,
  };
}

/**
 * Returns all versions for a resume, ordered by timestamp descending (most recent first).
 *
 * Requirements: 11.2
 */
export async function listVersions(
  userId: string,
  resumeId: string
): Promise<ResumeVersion[]> {
  const db = adminDb();
  const snap = await db
    .collection("users")
    .doc(userId)
    .collection("resumes")
    .doc(resumeId)
    .collection("versions")
    .orderBy("timestamp", "desc")
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      versionId: doc.id,
      resumeId: d.resumeId as string,
      userId: d.userId as string,
      data: d.data as ResumeData,
      timestamp: (d.timestamp as { toDate(): Date }).toDate
        ? (d.timestamp as { toDate(): Date }).toDate()
        : new Date(d.timestamp as string),
      versionNumber: d.versionNumber as number,
    };
  });
}

/**
 * Retrieves a specific version by versionId.
 *
 * Requirements: 11.3
 */
export async function getVersion(
  userId: string,
  resumeId: string,
  versionId: string
): Promise<ResumeVersion> {
  const db = adminDb();
  const doc = await db
    .collection("users")
    .doc(userId)
    .collection("resumes")
    .doc(resumeId)
    .collection("versions")
    .doc(versionId)
    .get();

  if (!doc.exists) {
    throw new Error(`Version not found: ${versionId}`);
  }

  const d = doc.data()!;
  return {
    versionId: doc.id,
    resumeId: d.resumeId as string,
    userId: d.userId as string,
    data: d.data as ResumeData,
    timestamp: (d.timestamp as { toDate(): Date }).toDate
      ? (d.timestamp as { toDate(): Date }).toDate()
      : new Date(d.timestamp as string),
    versionNumber: d.versionNumber as number,
  };
}

/**
 * Deletes all versions of a resume and the resume document itself.
 *
 * Requirements: 11.5
 */
export async function deleteResume(
  userId: string,
  resumeId: string
): Promise<void> {
  const db = adminDb();
  const resumeRef = db
    .collection("users")
    .doc(userId)
    .collection("resumes")
    .doc(resumeId);

  const versionsRef = resumeRef.collection("versions");

  // Delete all version documents in batches
  let hasMore = true;
  while (hasMore) {
    const snap = await versionsRef.limit(500).get();
    if (snap.empty) {
      hasMore = false;
      break;
    }
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    hasMore = snap.docs.length === 500;
  }

  // Delete the resume document itself
  await resumeRef.delete();
}
