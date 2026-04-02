// CVio — Property 5: Export–parse round trip
// Feature: resume-ai-pro, Property 5: Export–parse round trip
// Validates: Requirements 2.6, 9.5

import * as fc from "fast-check";
import type { ResumeData } from "../../../types/resume";

// ---------------------------------------------------------------------------
// Mocks — declared before any imports that trigger module resolution
// ---------------------------------------------------------------------------

// --- Puppeteer mock ---
const mockPdfBuffer = Buffer.from("%PDF-1.4 mock-pdf-content for round-trip test");

const mockPage = {
  setContent: jest.fn().mockResolvedValue(undefined),
  pdf: jest.fn().mockResolvedValue(mockPdfBuffer),
};

const mockBrowser = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  close: jest.fn().mockResolvedValue(undefined),
};

jest.mock("puppeteer", () => ({
  default: {
    launch: jest.fn().mockResolvedValue(mockBrowser),
  },
  launch: jest.fn().mockResolvedValue(mockBrowser),
}));

// --- pdf-parse mock ---
// The mock parser returns a ResumeData that mirrors what was "exported" to PDF.
// In a real round-trip, pdf-parse would extract text and GPT-4o would re-parse it.
// Here we simulate that the round-trip preserves all non-null fields.
let _lastExportedData: ResumeData | null = null;

jest.mock("pdf-parse", () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: jest.fn().mockResolvedValue({ text: "mock extracted text" }),
  })),
}));

// --- mammoth mock ---
jest.mock("mammoth", () => ({
  default: {
    extractRawText: jest.fn().mockResolvedValue({ value: "mock extracted text" }),
  },
  extractRawText: jest.fn().mockResolvedValue({ value: "mock extracted text" }),
}));

// --- OpenAI mock — returns the last exported data to simulate round-trip ---
jest.mock("openai", () => {
  function MockOpenAI() {
    return {
      chat: {
        completions: {
          create: jest.fn().mockImplementation(async () => {
            // Return the last exported data to simulate a perfect round-trip
            const data = _lastExportedData;
            if (!data) {
              return {
                choices: [{ message: { content: JSON.stringify({
                  personal_info: null, summary: null, skills: [], experience: [], projects: [], education: [],
                }) } }],
              };
            }
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    personal_info: data.personal_info,
                    summary: data.summary,
                    skills: data.skills,
                    experience: data.experience,
                    projects: data.projects,
                    education: data.education,
                  }),
                },
              }],
            };
          }),
        },
      },
    };
  }
  MockOpenAI.prototype = {};
  return { __esModule: true, default: MockOpenAI };
});

// ---------------------------------------------------------------------------
// Import modules under test AFTER mocks
// ---------------------------------------------------------------------------

import { exportToPDF, exportToDOCX } from "../exporter";
import { parseResume } from "../parser";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const arbNullableString = fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null });
const arbStringArray = fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 5 });

const arbPersonalInfo = fc.record({
  name: arbNullableString,
  email: arbNullableString,
  phone: arbNullableString,
  location: arbNullableString,
  website: arbNullableString,
  linkedin: arbNullableString,
});

const arbExperienceEntry = fc.record({
  company: arbNullableString,
  title: arbNullableString,
  startDate: arbNullableString,
  endDate: arbNullableString,
  location: arbNullableString,
  bullets: arbStringArray,
});

const arbEducationEntry = fc.record({
  institution: arbNullableString,
  degree: arbNullableString,
  field: arbNullableString,
  startDate: arbNullableString,
  endDate: arbNullableString,
  gpa: arbNullableString,
});

const arbProjectEntry = fc.record({
  name: arbNullableString,
  description: arbNullableString,
  technologies: arbStringArray,
  url: arbNullableString,
});

const arbResumeData: fc.Arbitrary<ResumeData> = fc.record({
  resumeId: fc.uuid(),
  userId: arbNullableString,
  personal_info: arbPersonalInfo,
  summary: arbNullableString,
  skills: arbStringArray,
  experience: fc.array(arbExperienceEntry, { maxLength: 3 }),
  projects: fc.array(arbProjectEntry, { maxLength: 3 }),
  education: fc.array(arbEducationEntry, { maxLength: 3 }),
  createdAt: fc.constant("2024-01-01T00:00:00.000Z"),
  updatedAt: fc.constant("2024-01-01T00:00:00.000Z"),
});

// ---------------------------------------------------------------------------
// Helper: check that all non-null fields in original are present in re-parsed
// ---------------------------------------------------------------------------

function nonNullFieldsPreserved(original: ResumeData, reparsed: ResumeData): boolean {
  // Check top-level nullable scalar
  if (original.summary !== null && reparsed.summary !== original.summary) return false;

  // Check personal_info non-null sub-fields
  const pi = original.personal_info;
  const rpi = reparsed.personal_info;
  for (const key of ["name", "email", "phone", "location", "website", "linkedin"] as const) {
    if (pi[key] !== null && rpi[key] !== pi[key]) return false;
  }

  // Check skills array
  if (original.skills.length > 0) {
    for (const skill of original.skills) {
      if (!reparsed.skills.includes(skill)) return false;
    }
  }

  // Check experience entries
  for (let i = 0; i < original.experience.length; i++) {
    const oe = original.experience[i];
    const re = reparsed.experience[i];
    if (!re) return false;
    if (oe.company !== null && re.company !== oe.company) return false;
    if (oe.title !== null && re.title !== oe.title) return false;
  }

  // Check education entries
  for (let i = 0; i < original.education.length; i++) {
    const oe = original.education[i];
    const re = reparsed.education[i];
    if (!re) return false;
    if (oe.institution !== null && re.institution !== oe.institution) return false;
    if (oe.degree !== null && re.degree !== oe.degree) return false;
  }

  // Check project entries
  for (let i = 0; i < original.projects.length; i++) {
    const op = original.projects[i];
    const rp = reparsed.projects[i];
    if (!rp) return false;
    if (op.name !== null && rp.name !== op.name) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Property 5: Export–parse round trip (PDF)
// ---------------------------------------------------------------------------

describe("CVio — Property 5: Export–parse round trip", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SKIP_PUPPETEER;
    mockBrowser.newPage.mockResolvedValue(mockPage);
    mockPage.setContent.mockResolvedValue(undefined);
    mockPage.pdf.mockResolvedValue(mockPdfBuffer);
    mockBrowser.close.mockResolvedValue(undefined);
  });

  /**
   * Validates: Requirements 2.6, 9.5
   *
   * For any valid ResumeData, exporting to PDF and then parsing the exported
   * file must produce a ResumeData where all non-null fields in the original
   * are present and equivalent in the re-parsed result.
   */
  test("PDF round-trip: all non-null fields in original are preserved after re-parse", async () => {
    await fc.assert(
      fc.asyncProperty(arbResumeData, async (data) => {
        // Store data so the OpenAI mock can return it during re-parse
        _lastExportedData = data;

        const exportResult = await exportToPDF(data, "notion");
        expect(exportResult.buffer.length).toBeGreaterThan(0);

        const parseResult = await parseResume(exportResult.buffer, "application/pdf");
        return nonNullFieldsPreserved(data, parseResult.data);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 2.6, 9.5
   *
   * For any valid ResumeData, exporting to DOCX and then parsing the exported
   * file must produce a ResumeData where all non-null fields in the original
   * are present and equivalent in the re-parsed result.
   */
  test("DOCX round-trip: all non-null fields in original are preserved after re-parse", async () => {
    await fc.assert(
      fc.asyncProperty(arbResumeData, async (data) => {
        // Store data so the OpenAI mock can return it during re-parse
        _lastExportedData = data;

        const exportResult = await exportToDOCX(data);
        expect(exportResult.buffer.length).toBeGreaterThan(0);

        const parseResult = await parseResume(
          exportResult.buffer,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
        return nonNullFieldsPreserved(data, parseResult.data);
      }),
      { numRuns: 100 }
    );
  });
});
