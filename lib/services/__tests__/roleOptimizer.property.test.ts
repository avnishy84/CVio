// CVio — Role Optimizer Property Tests
// Property 12: Role validation — accept/reject
// Validates: Requirements 5.1, 5.4

import * as fc from "fast-check";
import { validateRole } from "../roleOptimizer";
import { SUPPORTED_ROLES } from "../../../types/resume";
import type { SupportedRole } from "../../../types/resume";

// ---------------------------------------------------------------------------
// Property 12: Role validation — accept/reject
// Validates: Requirements 5.1, 5.4
// ---------------------------------------------------------------------------

describe("CVio — Property 12: Role validation — accept/reject", () => {
  /**
   * For any string input to validateRole, the function must return true if and
   * only if the string is one of the five supported roles. For all other strings,
   * it must return false.
   */

  test("validateRole returns true for all five supported roles", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...(SUPPORTED_ROLES as [SupportedRole, ...SupportedRole[]])),
        (role) => {
          return validateRole(role) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("validateRole returns false for arbitrary strings that are not supported roles", () => {
    // Generate strings that are guaranteed not to be any of the five supported roles
    const unsupportedStringArb = fc
      .string({ minLength: 0, maxLength: 100 })
      .filter((s) => !(SUPPORTED_ROLES as string[]).includes(s));

    fc.assert(
      fc.property(unsupportedStringArb, (role) => {
        return validateRole(role) === false;
      }),
      { numRuns: 100 }
    );
  });

  test("validateRole returns false for near-miss strings (wrong case, extra spaces, partial matches)", () => {
    const nearMisses = [
      "software developer",       // wrong case
      "SOFTWARE DEVELOPER",       // all caps
      "Software  Developer",      // double space
      " Software Developer",      // leading space
      "Software Developer ",      // trailing space
      "ui/ux designer",           // wrong case
      "UI/UX designer",           // mixed case
      "product manager",          // wrong case
      "hr",                       // wrong case
      "HR ",                      // trailing space
      "marketing",                // wrong case
      "MARKETING",                // all caps
      "Software",                 // partial
      "Developer",                // partial
      "Product",                  // partial
      "",                         // empty string
      "Unknown Role",             // completely unsupported
      "Data Scientist",           // unsupported role
      "DevOps Engineer",          // unsupported role
    ];

    fc.assert(
      fc.property(fc.constantFrom(...nearMisses), (role) => {
        return validateRole(role) === false;
      }),
      { numRuns: 100 }
    );
  });
});
