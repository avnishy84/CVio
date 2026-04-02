// CVio — Property 3: Parser output schema completeness — Validates: Requirements 2.3

import * as fc from "fast-check";
import type { ParseResult } from "../../../types/resume";

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports that trigger module resolution
// ---------------------------------------------------------------------------

const mockOpenAIResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          personal_info: null,
          summary: null,
          skills: [],
          experience: [],
          projects: [],
          education: [],
        }),
      },
    },
  ],
};

jest.mock("openai", () => {
  const mockCreate = jest.fn().mockResolvedValue(mockOpenAIResponse);

  function MockOpenAI() {
    return {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };
  }

  MockOpenAI.prototype = {};

  return {
    __esModule: true,
    default: MockOpenAI,
  };
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
// Property 3: Parser output schema completeness
// ---------------------------------------------------------------------------

const SIX_REQUIRED_KEYS = [
  "personal_info",
  "summary",
  "skills",
  "experience",
  "projects",
  "education",
] as const;

describe("CVio — Property 3: Parser output schema completeness", () => {
  /**
   * Validates: Requirements 2.3
   *
   * For any resume text input (PDF or DOCX), the Parser must return an object
   * that contains all six top-level keys: personal_info, summary, skills,
   * experience, projects, and education. Each key must be present (never absent),
   * though values may be null or empty arrays.
   */
  test("PDF: ParseResult.data always contains all 6 required keys", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (_rawText) => {
        // We use an arbitrary string to simulate varied resume text inputs.
        // The actual text content doesn't matter — the mock OpenAI always
        // returns a valid JSON with all 6 fields. What we're verifying is
        // that the parser's normalisation layer never drops a key.
        const buffer = Buffer.from(_rawText);
        const result: ParseResult = await parseResume(buffer, "application/pdf");

        for (const key of SIX_REQUIRED_KEYS) {
          if (!(key in result.data)) {
            return false;
          }
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  test("DOCX: ParseResult.data always contains all 6 required keys", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (_rawText) => {
        const buffer = Buffer.from(_rawText);
        const result: ParseResult = await parseResume(
          buffer,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );

        for (const key of SIX_REQUIRED_KEYS) {
          if (!(key in result.data)) {
            return false;
          }
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  test("Keys are present even when OpenAI returns all-null/empty values", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (_rawText) => {
        const buffer = Buffer.from(_rawText);
        const result: ParseResult = await parseResume(buffer, "application/pdf");

        // All 6 keys must exist — values may be null or []
        const data = result.data;
        return (
          "personal_info" in data &&
          "summary" in data &&
          "skills" in data &&
          "experience" in data &&
          "projects" in data &&
          "education" in data
        );
      }),
      { numRuns: 100 }
    );
  });
});
