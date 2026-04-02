// CVio — Auth Service
// Thin wrapper around Firebase Admin SDK for server-side token verification.
// Requirements: 10.1, 10.2, 10.3, 10.4

import { NextRequest, NextResponse } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "../firebaseAdmin";

export type { DecodedIdToken };

/**
 * Verifies a Firebase ID token and returns the decoded token payload.
 * Throws if the token is invalid or expired.
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
  return adminAuth().verifyIdToken(idToken);
}

/**
 * Handler signature for authenticated App Router API routes.
 * The decoded Firebase user is passed as the third argument.
 */
export type AuthedHandler<T = unknown> = (
  req: NextRequest,
  context: T,
  user: DecodedIdToken
) => Promise<NextResponse> | NextResponse;

/**
 * Middleware that wraps a Next.js App Router handler with Firebase auth verification.
 *
 * Usage:
 *   export const GET = withAuth(async (req, context, user) => { ... });
 *
 * Extracts the Bearer token from the Authorization header, verifies it via
 * Firebase Admin, and passes the decoded user as the third argument.
 * Returns 401 { error: "Unauthorized" } on missing or invalid token.
 */
export function withAuth<T = unknown>(handler: AuthedHandler<T>) {
  return async (req: NextRequest, context: T): Promise<NextResponse> => {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user: DecodedIdToken;
    try {
      user = await verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handler(req, context, user);
  };
}
