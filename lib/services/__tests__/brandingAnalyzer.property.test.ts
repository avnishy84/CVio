// CVio — Branding Analyzer Property Tests
// Feature: resume-ai-pro, Property 13: Branding result schema invariant
// Validates: Requirements 6.1, 6.2, 6.4

import * as fc from "fast-check";
import type {
  ResumeData,
  PersonalInfo,
  ExperienceEntry,
  EducationEntry,
  ProjectEntry,
} from "../../../types/resume";

// ---------------------------------------------------------------------------
// Mock OpenAI — intercept the lazy-initialized `new OpenAI(...)` call
// ---------------------------------------------------------------------------

const mockCreate = jest.fn();

jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

// Import after mocking so the module-level openai instance uses the mock
import { analyzeBranding } from "../brandingAnalyzer";

// ---------------------------------------------------------------------------
// Arbitrary generators
// ---------------------------------------------------------------------------

function arbitraryPersonalInfo(): fc.Arbitrary<PersonalInfo> {
  return fc.record({
    name: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
    email: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
    phone: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 20 })),
    location: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 50 })),
    website: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 100 })),
    linkedin: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 100 })),
  });
}

function arbitraryExperienceEntry(): fc.Arbitrary<ExperienceEntry> {
  return fc.record({
    company: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
    title: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
    startDate: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 20 })),
    endDate: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 20 })),
    location: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 50 })),
    bullets: fc.array(fc.string({ minLength: 0, maxLength: 200 }), { maxLength: 8 }),
  });
}

function arbitraryEducationEntry(): fc.Arbitrary<EducationEntry> {
  return fc.record({
    institution: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
    degree: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
    field: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 50 })),
    startDate: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 20 })),
    endDate: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 20 })),
    gpa: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 10 })),
  });
}

function arbitraryProjectEntry(): fc.Arbitrary<ProjectEntry> {
  return fc.record({
    name: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 50 })),
    description: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 200 })),
    technologies: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }),
    url: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 100 })),
  });
}

function arbitraryResumeData(): fc.Arbitrary<ResumeData> {
  return fc.record({
    resumeId: fc.string({ minLength: 1, maxLength: 36 }),
    userId: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 36 })),
    personal_info: arbitraryPersonalInfo(),
    summary: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 500 })),
    skills: fc.array(fc.string({ minLength: 1, maxLength: 40 }), { maxLength: 20 }),
    experience: fc.array(arbitraryExperienceEntry(), { maxLength: 5 }),
    projects: fc.array(arbitraryProjectEntry(), { maxLength: 5 }),
    education: fc.array(arbitraryEducationEntry(), { maxLength: 4 }),
    createdAt: fc.constant("2024-01-01T00:00:00.000Z"),
    updatedAt: fc.constant("2024-01-01T00:00:00.000Z"),
  });
}

/**
 * Generate a plausible GPT response for branding analysis.
 * Includes edge cases: out-of-range scores, invalid tones, empty arrays.
 */
function arbitraryGptBrandingResponse(): fc.Arbitrary<Record<string, unknown>> {
  const validTones = ["formal", "technical", "creative", "neutral"] as const;
  const invalidTones = ["casual", "aggressive", "unknown", "", "FORMAL", null, 42];

  return fc.record({
    // summaryScore: mix of valid, out-of-range, and non-numeric values
    summaryScore: fc.oneof(
      fc.integer({ min: 1, max: 10 }),          // valid
      fc.integer({ min: -100, max: 0 }),         // below range
      fc.integer({ min: 11, max: 100 }),         // above range
      fc.constant(0),                            // boundary below
      fc.constant(11),                           // boundary above
      fc.constant(null),                         // null
      fc.constant("seven"),                      // non-numeric string
      fc.double({ min: 1, max: 10 })             // float (should be clamped/rounded)
    ),
    // tone: mix of valid and invalid values
    tone: fc.oneof(
      fc.constantFrom(...validTones),
      fc.constantFrom(...invalidTones)
    ),
    hasUniqueValueProposition: fc.oneof(fc.boolean(), fc.constant(null), fc.constant("yes")),
    uvpSuggestion: fc.oneof(
      fc.string({ minLength: 0, maxLength: 200 }),
      fc.constant(null),
      fc.constant(undefined)
    ),
    // headlines: mix of valid arrays, empty arrays, non-arrays
    headlines: fc.oneof(
      fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
      fc.constant([]),                           // empty — must be filled with fallback
      fc.constant(null),                         // null — must be filled with fallback
      fc.array(fc.constant(""), { minLength: 1, maxLength: 3 }) // all-empty strings
    ),
    taglines: fc.oneof(
      fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
      fc.constant([]),
      fc.constant(null),
      fc.array(fc.constant(""), { minLength: 1, maxLength: 3 })
    ),
    careerNarratives: fc.oneof(
      fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 1, maxLength: 5 }),
      fc.constant([]),
      fc.constant(null),
      fc.array(fc.constant(""), { minLength: 1, maxLength: 3 })
    ),
  });
}

// ---------------------------------------------------------------------------
// Property 13: Branding result schema invariant
// Validates: Requirements 6.1, 6.2, 6.4
// ---------------------------------------------------------------------------

describe("CVio — Property 13: Branding result schema invariant", () => {
  const VALID_TONES = new Set(["formal", "technical", "creative", "neutral"]);

  beforeEach(() => {
    mockCreate.mockReset();
  });

  /**
   * **Validates: Requirements 6.1, 6.2, 6.4**
   *
   * For any ResumeData input, the BrandingResult returned by Branding_Analyzer
   * must satisfy:
   *   - summaryScore ∈ [1, 10]
   *   - tone ∈ {"formal", "technical", "creative", "neutral"}
   *   - headlines.length >= 1
   *   - taglines.length >= 1
   *   - careerNarratives.length >= 1
   *
   * This property is tested against a wide range of GPT responses including
   * out-of-range scores, invalid tones, empty arrays, and null values to verify
   * that the service's validation/clamping logic always enforces the invariants.
   */
  test(
    "BrandingResult always satisfies schema invariants regardless of GPT response shape",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryResumeData(),
          arbitraryGptBrandingResponse(),
          async (data, gptResponse) => {
            mockCreate.mockResolvedValue({
              choices: [{ message: { content: JSON.stringify(gptResponse) } }],
            });

            const result = await analyzeBranding(data);

            const scoreValid =
              Number.isInteger(result.summaryScore) &&
              result.summaryScore >= 1 &&
              result.summaryScore <= 10;

            const toneValid = VALID_TONES.has(result.tone);

            const headlinesValid =
              Array.isArray(result.headlines) && result.headlines.length >= 1;

            const taglinesValid =
              Array.isArray(result.taglines) && result.taglines.length >= 1;

            const narrativesValid =
              Array.isArray(result.careerNarratives) && result.careerNarratives.length >= 1;

            return scoreValid && toneValid && headlinesValid && taglinesValid && narrativesValid;
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  /**
   * **Validates: Requirements 6.1, 6.2, 6.4**
   *
   * On OpenAI error, the default BrandingResult must also satisfy all schema
   * invariants — ensuring the error fallback path is equally safe.
   */
  test(
    "BrandingResult schema invariants hold even when OpenAI throws an error",
    async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryResumeData(), async (data) => {
          mockCreate.mockRejectedValue(new Error("OpenAI service unavailable"));

          const result = await analyzeBranding(data);

          const scoreValid =
            Number.isInteger(result.summaryScore) &&
            result.summaryScore >= 1 &&
            result.summaryScore <= 10;

          const toneValid = VALID_TONES.has(result.tone);

          const headlinesValid =
            Array.isArray(result.headlines) && result.headlines.length >= 1;

          const taglinesValid =
            Array.isArray(result.taglines) && result.taglines.length >= 1;

          const narrativesValid =
            Array.isArray(result.careerNarratives) && result.careerNarratives.length >= 1;

          return scoreValid && toneValid && headlinesValid && taglinesValid && narrativesValid;
        }),
        { numRuns: 100 }
      );
    }
  );
});
