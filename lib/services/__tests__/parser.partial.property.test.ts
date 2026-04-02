// CVio — Property 4: Parser partial extraction reporting — Validates: Requirements 2.4

import * as fc from "fast-check";
import type { ParseResult, ResumeData } from "../../../types/resume";

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports that trigger module resolution
// ---------------------------------------------------------------------------

/**
 * We need a mutable reference so each fast-check iteration can configure
 * which fields the "AI" returns as null / empty.
 */
let mockGPTResponse: Record<string, unknown> = {};

const mockCreate = jest.fn().mockImplementation(() =>
  Promise.resolve({
    choices: [{ message: { content: JSON.stringify(mockGPTResponse) } }],
  })
);

jest.mock("openai", () => {
  function MockOpenAI() {
    return { chat: { completions: { create: mockCreate } } };
  }
  MockOpenAI.prototype = {};
  return { __esModule: true, default: MockOpenAI };
});

jest.mock("pdf-parse", () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: jest.fn().mockResolvedValue({ text: "mock resume text" }),
  })),
}));

jest.mock("mammoth", () => ({
  default: {
    extractRawText: jest.fn().mockResolvedValue({ value: "mock resume text" }),
  },
  extractRawText: jest.fn().mockResolvedValue({ value: "mock resume text" }),
}));

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are set up
// ---------------------------------------------------------------------------

import { parseResume } from "../parser";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * The 6 extractable top-level fields as defined in the design doc.
 */
const EXTRACTABLE_FIELDS = [
  "personal_info",
  "summary",
  "skills",
  "experience",
  "projects",
  "education",
] as const;

type ExtractableField = (typeof EXTRACTABLE_FIELDS)[number];

/**
 * Build a GPT response object where the fields in `nullFields` are set to
 * their "unextracted" representation, and the rest have non-empty values.
 *
 * The parser's `computeUnextractedFields` logic:
 *   - `summary`                → unextracted when value is null
 *   - `skills/experience/projects/education` → unextracted when array is empty ([])
 *   - `personal_info`          → unextracted only when ALL sub-fields are null
 */
function buildGPTResponse(nullFields: Set<ExtractableField>): Record<string, unknown> {
  return {
    personal_info: nullFields.has("personal_info")
      ? { name: null, email: null, phone: null, location: null, website: null, linkedin: null }
      : { name: "Jane Doe", email: "jane@example.com", phone: "555-0100", location: "NYC", website: null, linkedin: null },

    summary: nullFields.has("summary") ? null : "Experienced software engineer.",

    skills: nullFields.has("skills") ? [] : ["TypeScript", "React"],

    experience: nullFields.has("experience")
      ? []
      : [{ company: "Acme", title: "Engineer", startDate: "2020-01", endDate: null, location: null, bullets: [] }],

    projects: nullFields.has("projects")
      ? []
      : [{ name: "CVio", description: "AI resume builder", technologies: ["Next.js"], url: null }],

    education: nullFields.has("education")
      ? []
      : [{ institution: "MIT", degree: "BSc", field: "CS", startDate: "2016", endDate: "2020", gpa: null }],
  };
}

/**
 * Given a `ResumeData` object, compute which fields the parser's own
 * `computeUnextractedFields` logic would consider unextracted.
 * This mirrors the implementation in parser.ts so we can assert the
 * returned `unextractedFields` matches exactly.
 */
function expectedUnextractedFields(data: ResumeData): Set<ExtractableField> {
  const missing = new Set<ExtractableField>();

  for (const field of EXTRACTABLE_FIELDS) {
    const value = data[field];

    if (value === null) {
      missing.add(field);
    } else if (Array.isArray(value) && value.length === 0) {
      // Empty arrays → unextracted for list fields
      missing.add(field);
    } else if (
      field === "personal_info" &&
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      // personal_info → unextracted only when every sub-field is null
      const allNull = Object.values(value as Record<string, unknown>).every((v) => v === null);
      if (allNull) missing.add(field);
    }
  }

  return missing;
}

// ---------------------------------------------------------------------------
// fast-check arbitrary: a random subset of the 6 extractable fields
// ---------------------------------------------------------------------------

const arbitraryNullFieldSubset = (): fc.Arbitrary<Set<ExtractableField>> =>
  fc
    .array(fc.constantFrom(...EXTRACTABLE_FIELDS), {
      minLength: 0,
      maxLength: EXTRACTABLE_FIELDS.length,
    })
    .map((arr) => new Set(arr));

// ---------------------------------------------------------------------------
// Property 4: Parser partial extraction reporting
// ---------------------------------------------------------------------------

describe("CVio — Property 4: Parser partial extraction reporting", () => {
  /**
   * Validates: Requirements 2.4
   *
   * For any resume input where one or more fields cannot be extracted, the
   * returned unextractedFields array must contain exactly the keys whose
   * values are null in the returned ResumeData — no more, no fewer.
   */
  test(
    "unextractedFields contains exactly the null/empty fields — no more, no fewer",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryNullFieldSubset(),
          async (nullFields) => {
            // Configure the mock to return the chosen null/empty fields
            mockGPTResponse = buildGPTResponse(nullFields);

            const buffer = Buffer.from("mock resume text");
            const result: ParseResult = await parseResume(buffer, "application/pdf");

            // Compute what we expect based on the actual returned data
            const expected = expectedUnextractedFields(result.data);
            const actual = new Set(result.unextractedFields as ExtractableField[]);

            // No extra fields reported
            for (const field of actual) {
              if (!expected.has(field)) return false;
            }

            // No missing fields
            for (const field of expected) {
              if (!actual.has(field)) return false;
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  test(
    "unextractedFields is empty when all fields are fully extracted",
    async () => {
      mockGPTResponse = buildGPTResponse(new Set());

      const buffer = Buffer.from("complete resume text");
      const result: ParseResult = await parseResume(buffer, "application/pdf");

      expect(result.unextractedFields).toHaveLength(0);
    }
  );

  test(
    "unextractedFields lists all 6 fields when everything is null/empty",
    async () => {
      mockGPTResponse = buildGPTResponse(new Set(EXTRACTABLE_FIELDS));

      const buffer = Buffer.from("empty resume text");
      const result: ParseResult = await parseResume(buffer, "application/pdf");

      const actual = new Set(result.unextractedFields);
      for (const field of EXTRACTABLE_FIELDS) {
        expect(actual.has(field)).toBe(true);
      }
      expect(result.unextractedFields).toHaveLength(EXTRACTABLE_FIELDS.length);
    }
  );

  test(
    "DOCX: unextractedFields contains exactly the null/empty fields",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryNullFieldSubset(),
          async (nullFields) => {
            mockGPTResponse = buildGPTResponse(nullFields);

            const buffer = Buffer.from("mock docx text");
            const result: ParseResult = await parseResume(
              buffer,
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            );

            const expected = expectedUnextractedFields(result.data);
            const actual = new Set(result.unextractedFields as ExtractableField[]);

            for (const field of actual) {
              if (!expected.has(field)) return false;
            }
            for (const field of expected) {
              if (!actual.has(field)) return false;
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});
