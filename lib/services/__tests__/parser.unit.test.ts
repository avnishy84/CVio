// CVio — Unit Tests: Parser Service — Validates: Requirements 2.1, 2.2

import type { ParseResult } from "../../../types/resume";

// ---------------------------------------------------------------------------
// Mocks — declared before any imports that trigger module resolution
// ---------------------------------------------------------------------------

const mockPDFParseInstance = {
  getText: jest.fn().mockResolvedValue({ text: "mock pdf resume text" }),
};
const MockPDFParse = jest.fn().mockImplementation(() => mockPDFParseInstance);

jest.mock("pdf-parse", () => ({
  PDFParse: MockPDFParse,
}));

const mockMammothExtractRawText = jest
  .fn()
  .mockResolvedValue({ value: "mock docx resume text" });

jest.mock("mammoth", () => ({
  default: {
    extractRawText: mockMammothExtractRawText,
  },
  extractRawText: mockMammothExtractRawText,
}));

const mockOpenAICreate = jest.fn().mockResolvedValue({
  choices: [
    {
      message: {
        content: JSON.stringify({
          personal_info: {
            name: "Jane Doe",
            email: "jane@example.com",
            phone: "555-0100",
            location: "New York, NY",
            website: null,
            linkedin: null,
          },
          summary: "Experienced software engineer.",
          skills: ["TypeScript", "React"],
          experience: [
            {
              company: "Acme Corp",
              title: "Engineer",
              startDate: "2020-01",
              endDate: "Present",
              location: "Remote",
              bullets: ["Built features"],
            },
          ],
          projects: [
            {
              name: "CVio",
              description: "AI resume builder",
              technologies: ["Next.js"],
              url: null,
            },
          ],
          education: [
            {
              institution: "State University",
              degree: "BSc",
              field: "Computer Science",
              startDate: "2016-09",
              endDate: "2020-05",
              gpa: "3.8",
            },
          ],
        }),
      },
    },
  ],
});

jest.mock("openai", () => {
  function MockOpenAI() {
    return {
      chat: {
        completions: {
          create: mockOpenAICreate,
        },
      },
    };
  }
  MockOpenAI.prototype = {};
  return { __esModule: true, default: MockOpenAI };
});

// ---------------------------------------------------------------------------
// Import module under test AFTER mocks
// ---------------------------------------------------------------------------

import { parseResume } from "../parser";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PDF_BUFFER = Buffer.from("%PDF-1.4 fake pdf content");
const DOCX_BUFFER = Buffer.from("PK fake docx content");
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  // Re-apply default resolved values after clearAllMocks
  mockPDFParseInstance.getText.mockResolvedValue({ text: "mock pdf resume text" });
  mockMammothExtractRawText.mockResolvedValue({ value: "mock docx resume text" });
  mockOpenAICreate.mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            personal_info: {
              name: "Jane Doe",
              email: "jane@example.com",
              phone: "555-0100",
              location: "New York, NY",
              website: null,
              linkedin: null,
            },
            summary: "Experienced software engineer.",
            skills: ["TypeScript", "React"],
            experience: [
              {
                company: "Acme Corp",
                title: "Engineer",
                startDate: "2020-01",
                endDate: "Present",
                location: "Remote",
                bullets: ["Built features"],
              },
            ],
            projects: [
              {
                name: "CVio",
                description: "AI resume builder",
                technologies: ["Next.js"],
                url: null,
              },
            ],
            education: [
              {
                institution: "State University",
                degree: "BSc",
                field: "Computer Science",
                startDate: "2016-09",
                endDate: "2020-05",
                gpa: "3.8",
              },
            ],
          }),
        },
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// Requirement 2.1 — PDF path
// ---------------------------------------------------------------------------

describe("PDF path (Requirement 2.1)", () => {
  test("calls PDFParse with the provided buffer", async () => {
    await parseResume(PDF_BUFFER, "application/pdf");
    expect(MockPDFParse).toHaveBeenCalledTimes(1);
    expect(MockPDFParse).toHaveBeenCalledWith({ data: PDF_BUFFER });
  });

  test("calls getText() on the PDFParse instance", async () => {
    await parseResume(PDF_BUFFER, "application/pdf");
    expect(mockPDFParseInstance.getText).toHaveBeenCalledTimes(1);
  });

  test("does NOT call mammoth.extractRawText for PDF", async () => {
    await parseResume(PDF_BUFFER, "application/pdf");
    expect(mockMammothExtractRawText).not.toHaveBeenCalled();
  });

  test("returns a ParseResult with all required ResumeData fields", async () => {
    const result: ParseResult = await parseResume(PDF_BUFFER, "application/pdf");
    const { data } = result;

    expect(data).toHaveProperty("personal_info");
    expect(data).toHaveProperty("summary");
    expect(data).toHaveProperty("skills");
    expect(data).toHaveProperty("experience");
    expect(data).toHaveProperty("projects");
    expect(data).toHaveProperty("education");
    expect(data).toHaveProperty("resumeId");
    expect(data).toHaveProperty("createdAt");
    expect(data).toHaveProperty("updatedAt");
  });

  test("resumeId is a non-empty string", async () => {
    const { data } = await parseResume(PDF_BUFFER, "application/pdf");
    expect(typeof data.resumeId).toBe("string");
    expect(data.resumeId.length).toBeGreaterThan(0);
  });

  test("createdAt and updatedAt are valid ISO 8601 strings", async () => {
    const { data } = await parseResume(PDF_BUFFER, "application/pdf");
    expect(() => new Date(data.createdAt)).not.toThrow();
    expect(new Date(data.createdAt).toISOString()).toBe(data.createdAt);
    expect(() => new Date(data.updatedAt)).not.toThrow();
    expect(new Date(data.updatedAt).toISOString()).toBe(data.updatedAt);
  });
});

// ---------------------------------------------------------------------------
// Requirement 2.2 — DOCX path
// ---------------------------------------------------------------------------

describe("DOCX path (Requirement 2.2)", () => {
  test("calls mammoth.extractRawText with the provided buffer", async () => {
    await parseResume(DOCX_BUFFER, DOCX_MIME);
    expect(mockMammothExtractRawText).toHaveBeenCalledTimes(1);
    expect(mockMammothExtractRawText).toHaveBeenCalledWith({ buffer: DOCX_BUFFER });
  });

  test("does NOT call PDFParse for DOCX", async () => {
    await parseResume(DOCX_BUFFER, DOCX_MIME);
    expect(MockPDFParse).not.toHaveBeenCalled();
  });

  test("returns a ParseResult with all required ResumeData fields", async () => {
    const result: ParseResult = await parseResume(DOCX_BUFFER, DOCX_MIME);
    const { data } = result;

    expect(data).toHaveProperty("personal_info");
    expect(data).toHaveProperty("summary");
    expect(data).toHaveProperty("skills");
    expect(data).toHaveProperty("experience");
    expect(data).toHaveProperty("projects");
    expect(data).toHaveProperty("education");
    expect(data).toHaveProperty("resumeId");
    expect(data).toHaveProperty("createdAt");
    expect(data).toHaveProperty("updatedAt");
  });

  test("resumeId is a non-empty string", async () => {
    const { data } = await parseResume(DOCX_BUFFER, DOCX_MIME);
    expect(typeof data.resumeId).toBe("string");
    expect(data.resumeId.length).toBeGreaterThan(0);
  });

  test("createdAt and updatedAt are valid ISO 8601 strings", async () => {
    const { data } = await parseResume(DOCX_BUFFER, DOCX_MIME);
    expect(() => new Date(data.createdAt)).not.toThrow();
    expect(new Date(data.createdAt).toISOString()).toBe(data.createdAt);
    expect(() => new Date(data.updatedAt)).not.toThrow();
    expect(new Date(data.updatedAt).toISOString()).toBe(data.updatedAt);
  });
});
