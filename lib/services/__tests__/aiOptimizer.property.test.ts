// CVio — AI Optimizer Property Tests
// Property 6: AI Optimizer preserves factual fields — Validates: Requirements 3.4
// Property 7: AI Optimizer error fallback — Validates: Requirements 3.5

import * as fc from "fast-check";
import type {
  ResumeData,
  PersonalInfo,
  ExperienceEntry,
  EducationEntry,
  ProjectEntry,
} from "../../../types/resume";

// ---------------------------------------------------------------------------
// Mock OpenAI — intercept the module-level `new OpenAI(...)` call
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

// Import after mocking so the module-level `openai` instance uses the mock
import { optimizeResume } from "../aiOptimizer";

// ---------------------------------------------------------------------------
// Arbitrary generators (mirrored from atsScorer.property.test.ts)
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

// ---------------------------------------------------------------------------
// Helpers to extract factual field sets from a ResumeData
// ---------------------------------------------------------------------------

function extractFactualFields(data: ResumeData) {
  const companies = new Set(
    data.experience.map((e) => e.company).filter((v): v is string => v !== null)
  );
  const titles = new Set(
    data.experience.map((e) => e.title).filter((v): v is string => v !== null)
  );
  const startDates = new Set(
    data.experience.map((e) => e.startDate).filter((v): v is string => v !== null)
  );
  const endDates = new Set(
    data.experience.map((e) => e.endDate).filter((v): v is string => v !== null)
  );
  const institutions = new Set(
    data.education.map((e) => e.institution).filter((v): v is string => v !== null)
  );
  const degrees = new Set(
    data.education.map((e) => e.degree).filter((v): v is string => v !== null)
  );
  return { companies, titles, startDates, endDates, institutions, degrees };
}

function isSubset<T>(subset: Set<T>, superset: Set<T>): boolean {
  for (const item of subset) {
    if (!superset.has(item)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Property 6: AI Optimizer preserves factual fields
// Validates: Requirements 3.4
// ---------------------------------------------------------------------------

describe("CVio — Property 6: AI Optimizer preserves factual fields", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  /**
   * For any ResumeData, after running through AI_Optimizer, the set of employer
   * names, job titles, employment dates, educational institution names, and degree
   * names in the output must be a subset of those present in the original input.
   * No new values may be introduced for these fields.
   */
  test("output factual fields are subsets of input factual fields", async () => {
    // Mock OpenAI to return the same data but with modified summary/bullets only
    // (non-factual fields) — factual fields remain identical to the input
    mockCreate.mockImplementation(async (params: { messages: Array<{ content: string }> }) => {
      const userContent = params.messages[1]?.content ?? "{}";
      const original: ResumeData = JSON.parse(userContent);

      const modified: ResumeData = {
        ...original,
        summary: "Experienced professional with a proven track record.",
        experience: original.experience.map((exp) => ({
          ...exp,
          bullets: exp.bullets.map(() => "Led cross-functional initiatives to drive results."),
        })),
      };

      return {
        choices: [{ message: { content: JSON.stringify(modified) } }],
      };
    });

    await fc.assert(
      fc.asyncProperty(arbitraryResumeData(), async (data) => {
        const inputFields = extractFactualFields(data);
        const result = await optimizeResume(data);

        // No error should occur when the mock succeeds
        if (result.error) return false;

        const outputFields = extractFactualFields(result.data);

        return (
          isSubset(outputFields.companies, inputFields.companies) &&
          isSubset(outputFields.titles, inputFields.titles) &&
          isSubset(outputFields.startDates, inputFields.startDates) &&
          isSubset(outputFields.endDates, inputFields.endDates) &&
          isSubset(outputFields.institutions, inputFields.institutions) &&
          isSubset(outputFields.degrees, inputFields.degrees)
        );
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: AI Optimizer error fallback
// Validates: Requirements 3.5
// ---------------------------------------------------------------------------

describe("CVio — Property 7: AI Optimizer error fallback", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  /**
   * For any ResumeData, when the OpenAI API call fails (network error, rate limit,
   * or non-2xx response), the OptimizationResult must contain the original
   * ResumeData unchanged and a non-empty error string.
   */
  test("on OpenAI failure, result.data equals original and result.error is non-empty", async () => {
    const errorMessages = [
      "Network error",
      "Rate limit exceeded",
      "Service unavailable",
      "Request timeout",
    ];

    await fc.assert(
      fc.asyncProperty(
        arbitraryResumeData(),
        fc.integer({ min: 0, max: errorMessages.length - 1 }),
        async (data, errorIndex) => {
          mockCreate.mockRejectedValue(new Error(errorMessages[errorIndex]));

          const result = await optimizeResume(data);

          // result.data must deeply equal the original input
          const dataUnchanged = JSON.stringify(result.data) === JSON.stringify(data);

          // result.error must be a non-empty string
          const hasError =
            typeof result.error === "string" && result.error.length > 0;

          return dataUnchanged && hasError;
        }
      ),
      { numRuns: 100 }
    );
  });
});
