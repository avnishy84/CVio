/**
 * CVio — POST /api/role-optimize
 * Accepts a JSON body with a ResumeData object and a target role string,
 * validates the role, runs role-based optimization, and returns a RoleOptimizationResult.
 *
 * Protected by withAuth middleware (Firebase ID token required).
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../lib/services/authService";
import { validateRole, optimizeForRole } from "../../../lib/services/roleOptimizer";
import { SUPPORTED_ROLES } from "../../../types/resume";
import type { ResumeData } from "../../../types/resume";

export const POST = withAuth(async (req: NextRequest): Promise<NextResponse> => {
  let body: { data?: ResumeData; role?: string };
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

  if (!body.role) {
    return NextResponse.json(
      { error: "Missing required field: role", supportedRoles: SUPPORTED_ROLES },
      { status: 400 }
    );
  }

  if (!validateRole(body.role)) {
    return NextResponse.json(
      {
        error: `Supported roles: ${SUPPORTED_ROLES.join(", ")}`,
        supportedRoles: SUPPORTED_ROLES,
      },
      { status: 400 }
    );
  }

  const result = await optimizeForRole(body.data, body.role);
  return NextResponse.json(result, { status: 200 });
});
