// CVio — LinkedIn Comparator Property Tests
// Feature: resume-ai-pro
// Property 14: LinkedIn comparison detects known differences — Validates: Requirements 7.2
// Property 15: LinkedIn selective import — Validates: Requirements 7.4
// Property 16: LinkedIn error preserves data — Validates: Requirements 7.5

import * as fc from "fast-check";
import type {
  ResumeData,
  PersonalInfo,
  ExperienceEntry,
  EducationEntry,
  ProjectEntry,
} from "../../../types/resume";

// ---------------------------------------------------------------------------
// Mock openai, pdf-parse, and https/http modules
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

jest.mock("pdf-parse", () => jest.fn());

// Mock the built-in https module used by fetchUrl
jest.mock("https", () => ({
  get: jest.fn(),
}));

jest.mock("http", () => ({
  get: jest.fn(),
}));

import { compareWithLinkedIn, importLinkedInFields } from "../linkedInComparator";
import pdfParse from "pdf-parse";
import https from "https";

const mockPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>;
const mockHttpsGet = https.get as jest.MockedFunction<typeof https.get>;

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
    startDate: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 20 })),
    endDate: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 20 })),
    location: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 50 })),
    bullets: fc.array(fc.string({ minLength: 0, maxLength: 200 }), { maxLength: 5 }),
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
// Helper: build a GPT comparison response that includes at least one
// Inconsistency for a known differing field
// ---------------------------------------------------------------------------

function buildComparisonResponse(field: string, resumeValue: string, linkedInValue: string) {
  return {
    inconsistencies: [
      {
        field,
        resumeValue,
        linkedInValue,
        priority: "high" as const,
      },
    ],
    resumeSuggestions: [`Update ${field} on your resume to match LinkedIn`],
    linkedInSuggestions: [`Update ${field} on LinkedIn to match your resume`],
  };
}

// ---------------------------------------------------------------------------
// Property 14: LinkedIn comparison detects known differences
// Validates: Requirements 7.2
// ---------------------------------------------------------------------------

describe("CVio — Property 14: LinkedIn comparison detects known differences", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockPdfParse.mockReset();
    mockHttpsGet.mockReset();
  });

  /**
   * **Validates: Requirements 7.2**
   *
   * For any pair of ResumeData objects that differ in at least one of job titles,
   * dates, skills, or education fields, the LinkedIn_Comparator must include at
   * least one Inconsistency entry referencing the differing field.
   *
   * Strategy: generate a resume and a modified LinkedIn version that differs in
   * one of the tracked fields. Mock GPT to return an Inconsistency for that field.
   * Assert the result contains at least one inconsistency.
   */
  test(
    "comparison result includes at least one inconsistency when resume and LinkedIn differ",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryResumeData(),
          // Pick which field type differs: 0=title, 1=startDate, 2=skills, 3=education degree
          fc.integer({ min: 0, max: 3 }),
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.string({ minLength: 1, maxLength: 30 }),
          async (resumeData, fieldType, resumeVal, linkedInVal) => {
            // Ensure the two values are actually different
            const rVal = resumeVal;
            const lVal = linkedInVal === resumeVal ? linkedInVal + "_li" : linkedInVal;

            const fieldNames = [
              "experience[0].title",
              "experience[0].startDate",
              "skills",
              "education[0].degree",
            ];
            const fieldName = fieldNames[fieldType];

            // First GPT call: extraction — return a partial ResumeData
            // Second GPT call: comparison — return an inconsistency for the differing field
            let callCount = 0;
            mockCreate.mockImplementation(async () => {
              callCount++;
              if (callCount === 1) {
                // Extraction call
                return {
                  choices: [{ message: { content: JSON.stringify({ skills: [lVal] }) } }],
                };
              }
              // Comparison call
              return {
                choices: [
                  {
                    message: {
                      content: JSON.stringify(
                        buildComparisonResponse(fieldName, rVal, lVal)
                      ),
                    },
                  },
                ],
              };
            });

            // Mock PDF parse to return text
            mockPdfParse.mockResolvedValue({
              text: `LinkedIn profile text with ${lVal}`,
              numpages: 1,
              numrender: 1,
              info: {},
              metadata: {},
              version: "1.0",
            } as never);

            const result = await compareWithLinkedIn(resumeData, {
              type: "pdf",
              value: Buffer.from("fake pdf"),
            });

            // Must have at least one inconsistency
            return (
              Array.isArray(result.inconsistencies) &&
              result.inconsistencies.length >= 1
            );
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Property 15: LinkedIn selective import
// Validates: Requirements 7.4
// ---------------------------------------------------------------------------

describe("CVio — Property 15: LinkedIn selective import", () => {
  /**
   * **Validates: Requirements 7.4**
   *
   * For any ResumeData, LinkedIn data, and non-empty set of selectedFields,
   * after calling importLinkedInFields:
   * - each field in selectedFields must equal the corresponding value from LinkedIn data
   * - every field not in selectedFields must be identical to its value in the original ResumeData
   */
  test(
    "selected fields come from LinkedIn data; unselected fields remain from original",
    () => {
      // The fields we can meaningfully test (all top-level ResumeData keys)
      const allFields: (keyof ResumeData)[] = [
        "summary",
        "skills",
        "experience",
        "education",
        "projects",
        "personal_info",
      ];

      fc.assert(
        fc.property(
          arbitraryResumeData(),
          arbitraryResumeData(),
          // Non-empty subset of allFields
          fc.array(fc.constantFrom(...allFields), { minLength: 1, maxLength: allFields.length }),
          (original, linkedInSource, selectedFields) => {
            // Build a Partial<ResumeData> from the linkedInSource
            const linkedInData: Partial<ResumeData> = {};
            for (const f of allFields) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (linkedInData as any)[f] = (linkedInSource as any)[f];
            }

            const result = importLinkedInFields(original, linkedInData, selectedFields);

            // Check selected fields come from LinkedIn
            for (const field of selectedFields) {
              const resultVal = JSON.stringify(result[field]);
              const liVal = JSON.stringify(linkedInData[field]);
              if (resultVal !== liVal) return false;
            }

            // Check unselected fields remain from original
            const selectedSet = new Set(selectedFields);
            for (const field of allFields) {
              if (!selectedSet.has(field)) {
                const resultVal = JSON.stringify(result[field]);
                const origVal = JSON.stringify(original[field]);
                if (resultVal !== origVal) return false;
              }
            }

            // Non-array/non-object fields (resumeId, userId, createdAt, updatedAt)
            // that are not in selectedFields must also be unchanged
            const metaFields: (keyof ResumeData)[] = ["resumeId", "userId", "createdAt", "updatedAt"];
            for (const field of metaFields) {
              if (!selectedSet.has(field)) {
                if (result[field] !== original[field]) return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  test("importLinkedInFields does not mutate the original ResumeData", () => {
    fc.assert(
      fc.property(
        arbitraryResumeData(),
        arbitraryResumeData(),
        (original, linkedInSource) => {
          const linkedInData: Partial<ResumeData> = { skills: linkedInSource.skills };
          const originalSnapshot = JSON.stringify(original);

          importLinkedInFields(original, linkedInData, ["skills"]);

          // Original must be unchanged
          return JSON.stringify(original) === originalSnapshot;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 16: LinkedIn error preserves data
// Validates: Requirements 7.5
// ---------------------------------------------------------------------------

describe("CVio — Property 16: LinkedIn error preserves data", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockPdfParse.mockReset();
    mockHttpsGet.mockReset();
  });

  /**
   * **Validates: Requirements 7.5**
   *
   * For any ResumeData and any failing LinkedIn source (inaccessible URL or
   * unparseable PDF), the LinkedIn_Comparator must return an error and the
   * caller's ResumeData must remain byte-for-byte identical to the input.
   */
  test(
    "on PDF parse failure, result has error and original ResumeData is unchanged",
    async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryResumeData(), async (data) => {
          // Simulate unparseable PDF
          mockPdfParse.mockRejectedValue(new Error("PDF parse error: invalid format"));

          const originalSnapshot = JSON.stringify(data);

          const result = await compareWithLinkedIn(data, {
            type: "pdf",
            value: Buffer.from("corrupt pdf data"),
          });

          // Must have an error property
          const hasError =
            "error" in result &&
            typeof (result as { error?: string }).error === "string" &&
            (result as { error?: string }).error!.length > 0;

          // Original data must be unchanged
          const dataUnchanged = JSON.stringify(data) === originalSnapshot;

          // Inconsistencies must be empty on error
          const emptyInconsistencies =
            Array.isArray(result.inconsistencies) &&
            result.inconsistencies.length === 0;

          return hasError && dataUnchanged && emptyInconsistencies;
        }),
        { numRuns: 100 }
      );
    }
  );

  test(
    "on URL fetch failure (https.get error), result has error and original ResumeData is unchanged",
    async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryResumeData(), async (data) => {
          // Simulate inaccessible URL by making https.get call the error callback
          mockHttpsGet.mockImplementation((_url: unknown, _cb?: unknown) => {
            const fakeReq = {
              on: (event: string, handler: (err: Error) => void) => {
                if (event === "error") {
                  // Trigger error asynchronously
                  setImmediate(() => handler(new Error("ECONNREFUSED: connection refused")));
                }
                return fakeReq;
              },
              setTimeout: (_ms: number, cb: () => void) => { void _ms; void cb; return fakeReq; },
              destroy: () => fakeReq,
            };
            return fakeReq as never;
          });

          const originalSnapshot = JSON.stringify(data);

          const result = await compareWithLinkedIn(data, {
            type: "url",
            value: "https://linkedin.com/in/test-user",
          });

          const hasError =
            "error" in result &&
            typeof (result as { error?: string }).error === "string" &&
            (result as { error?: string }).error!.length > 0;

          const dataUnchanged = JSON.stringify(data) === originalSnapshot;

          const emptyInconsistencies =
            Array.isArray(result.inconsistencies) &&
            result.inconsistencies.length === 0;

          return hasError && dataUnchanged && emptyInconsistencies;
        }),
        { numRuns: 50 }
      );
    }
  );

  test(
    "on OpenAI extraction failure, result has error and original ResumeData is unchanged",
    async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryResumeData(), async (data) => {
          // PDF parses fine but GPT fails
          mockPdfParse.mockResolvedValue({
            text: "Some LinkedIn profile text",
            numpages: 1,
            numrender: 1,
            info: {},
            metadata: {},
            version: "1.0",
          } as never);

          mockCreate.mockRejectedValue(new Error("OpenAI rate limit exceeded"));

          const originalSnapshot = JSON.stringify(data);

          const result = await compareWithLinkedIn(data, {
            type: "pdf",
            value: Buffer.from("valid pdf"),
          });

          const hasError =
            "error" in result &&
            typeof (result as { error?: string }).error === "string" &&
            (result as { error?: string }).error!.length > 0;

          const dataUnchanged = JSON.stringify(data) === originalSnapshot;

          return hasError && dataUnchanged;
        }),
        { numRuns: 100 }
      );
    }
  );
});
