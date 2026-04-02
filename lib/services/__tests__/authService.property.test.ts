// CVio — Auth Service Property Tests
// Feature: resume-ai-pro
// Property 21: Invalid credentials do not establish sessions — Validates: Requirements 10.3
// Property 22: User data isolation — Validates: Requirements 10.4

import * as fc from "fast-check";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Mock firebase-admin before importing authService
// ---------------------------------------------------------------------------

const mockVerifyIdToken = jest.fn();

jest.mock("../../firebaseAdmin", () => ({
  adminAuth: () => ({
    verifyIdToken: mockVerifyIdToken,
  }),
}));

import { verifyIdToken, withAuth } from "../authService";
import type { DecodedIdToken } from "../authService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal NextRequest with an optional Authorization header */
function makeRequest(authHeader?: string): NextRequest {
  const url = "http://localhost/api/test";
  const init: RequestInit = authHeader ? { headers: { authorization: authHeader } } : {};
  return new NextRequest(url, init);
}

/** Build a minimal DecodedIdToken for a given uid */
function makeDecodedToken(uid: string): DecodedIdToken {
  return {
    uid,
    aud: "test-project",
    auth_time: 0,
    exp: 9999999999,
    iat: 0,
    iss: "https://securetoken.google.com/test-project",
    sub: uid,
    firebase: { identities: {}, sign_in_provider: "password" },
  } as DecodedIdToken;
}

// ---------------------------------------------------------------------------
// Property 21: Invalid credentials do not establish sessions
// Validates: Requirements 10.3
// ---------------------------------------------------------------------------

describe("CVio — Property 21: Invalid credentials do not establish sessions", () => {
  /**
   * For any credential pair that does not match a registered user, the Auth_Service
   * must not return a valid session token and must return an error response.
   *
   * We model this by having verifyIdToken throw for any token that is not
   * in the "registered" set, and assert that withAuth always returns 401.
   */

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("missing Authorization header always returns 401", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (_ignored) => {
        const handler = withAuth(async (_req, _ctx, _user) =>
          NextResponse.json({ ok: true })
        );
        const req = makeRequest(); // no auth header
        const res = await handler(req, undefined);
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body).toEqual({ error: "Unauthorized" });
      }),
      { numRuns: 100 }
    );
  });

  test("non-Bearer Authorization header always returns 401", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => !s.startsWith("Bearer ")),
        async (badHeader) => {
          const handler = withAuth(async (_req, _ctx, _user) =>
            NextResponse.json({ ok: true })
          );
          const req = makeRequest(badHeader);
          const res = await handler(req, undefined);
          expect(res.status).toBe(401);
          const body = await res.json();
          expect(body).toEqual({ error: "Unauthorized" });
        }
      ),
      { numRuns: 100 }
    );
  });

  test("any token rejected by verifyIdToken returns 401 and no session", async () => {
    // Configure mock to always reject (simulates invalid credentials for all tokens)
    mockVerifyIdToken.mockRejectedValue(new Error("auth/invalid-id-token"));

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (invalidToken) => {
          let handlerCalled = false;
          const handler = withAuth(async (_req, _ctx, _user) => {
            handlerCalled = true;
            return NextResponse.json({ ok: true });
          });
          const req = makeRequest(`Bearer ${invalidToken}`);
          const res = await handler(req, undefined);

          expect(res.status).toBe(401);
          const body = await res.json();
          expect(body).toEqual({ error: "Unauthorized" });
          // The inner handler must never have been called — no session established
          expect(handlerCalled).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("verifyIdToken propagates rejection for any invalid token string", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("auth/argument-error"));

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (invalidToken) => {
          await expect(verifyIdToken(invalidToken)).rejects.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 22: User data isolation
// Validates: Requirements 10.4
// ---------------------------------------------------------------------------

describe("CVio — Property 22: User data isolation", () => {
  /**
   * For any two distinct authenticated users A and B, all API routes that return
   * resume data for user A must return only documents whose userId equals A's UID,
   * and must return a 403 or empty result when user B's token is used to request
   * user A's resources.
   *
   * We model this with a handler that simulates a resource owned by userA:
   * - When called with userA's token → returns the resource (200)
   * - When called with userB's token → returns 403
   */

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("user B cannot access user A's resources — returns 403", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(fc.uuid(), fc.uuid()).filter(([a, b]) => a !== b),
        async ([uidA, uidB]) => {
          // Use uid as the token directly for clean matching
          mockVerifyIdToken.mockImplementation((token: string) => {
            if (token === uidA) return Promise.resolve(makeDecodedToken(uidA));
            if (token === uidB) return Promise.resolve(makeDecodedToken(uidB));
            return Promise.reject(new Error("auth/invalid-id-token"));
          });

          // Handler simulates a resource owned by uidA
          const handler = withAuth(async (_req, _ctx, user) => {
            if (user.uid !== uidA) {
              return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            return NextResponse.json({ userId: uidA, data: "resume-data" });
          });

          // User A can access their own resource
          const resA = await handler(makeRequest(`Bearer ${uidA}`), undefined);
          expect(resA.status).toBe(200);
          const bodyA = await resA.json();
          expect(bodyA.userId).toBe(uidA);

          // User B is denied access to user A's resource
          const resB = await handler(makeRequest(`Bearer ${uidB}`), undefined);
          expect(resB.status).toBe(403);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("response data for user A never contains userId of user B", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(fc.uuid(), fc.uuid()).filter(([a, b]) => a !== b),
        async ([uidA, uidB]) => {
          mockVerifyIdToken.mockImplementation((token: string) => {
            if (token === uidA) return Promise.resolve(makeDecodedToken(uidA));
            if (token === uidB) return Promise.resolve(makeDecodedToken(uidB));
            return Promise.reject(new Error("auth/invalid-id-token"));
          });

          // Handler returns resume documents filtered to the authenticated user
          const handler = withAuth(async (_req, _ctx, user) => {
            // Simulate Firestore query: only return docs where userId === user.uid
            const docs = [
              { resumeId: "r1", userId: uidA },
              { resumeId: "r2", userId: uidA },
            ].filter((doc) => doc.userId === user.uid);
            return NextResponse.json({ resumes: docs });
          });

          // User B authenticates and calls the route
          const res = await handler(makeRequest(`Bearer ${uidB}`), undefined);
          expect(res.status).toBe(200);
          const body = await res.json();

          // User B must receive an empty list — no documents belonging to user A
          const hasUserADoc = body.resumes.some(
            (doc: { userId: string }) => doc.userId === uidA
          );
          expect(hasUserADoc).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("withAuth passes the correct decoded user uid to the handler", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (uid) => {
          mockVerifyIdToken.mockResolvedValue(makeDecodedToken(uid));

          let capturedUid: string | undefined;
          const handler = withAuth(async (_req, _ctx, user) => {
            capturedUid = user.uid;
            return NextResponse.json({ ok: true });
          });

          const res = await handler(makeRequest(`Bearer ${uid}`), undefined);
          expect(res.status).toBe(200);
          expect(capturedUid).toBe(uid);
        }
      ),
      { numRuns: 100 }
    );
  });
});
