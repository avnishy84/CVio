// CVio — Unit Tests: Exporter Service — Validates: Requirements 9.1, 9.2

import type { ResumeData, ExportResult } from "../../../types/resume";

// ---------------------------------------------------------------------------
// Mocks — declared before any imports that trigger module resolution
// ---------------------------------------------------------------------------

const mockPdfBuffer = Buffer.from("%PDF-1.4 fake-pdf-content");

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

// ---------------------------------------------------------------------------
// Import module under test AFTER mocks
// ---------------------------------------------------------------------------

import { exportToPDF, exportToDOCX } from "../exporter";

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const FIXTURE: ResumeData = {
  resumeId: "test-resume-id",
  userId: "user-123",
  personal_info: {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "555-0100",
    location: "New York, NY",
    website: "https://janedoe.dev",
    linkedin: "https://linkedin.com/in/janedoe",
  },
  summary: "Experienced software engineer with 5+ years building web apps.",
  skills: ["TypeScript", "React", "Node.js"],
  experience: [
    {
      company: "Acme Corp",
      title: "Senior Engineer",
      startDate: "2020-01",
      endDate: "Present",
      location: "Remote",
      bullets: ["Led migration to TypeScript", "Reduced build time by 40%"],
    },
  ],
  projects: [
    {
      name: "CVio",
      description: "AI-powered resume builder",
      technologies: ["Next.js", "OpenAI"],
      url: "https://cvio.app",
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
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.SKIP_PUPPETEER;
  mockBrowser.newPage.mockResolvedValue(mockPage);
  mockPage.setContent.mockResolvedValue(undefined);
  mockPage.pdf.mockResolvedValue(mockPdfBuffer);
  mockBrowser.close.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// PDF export — Requirement 9.1
// ---------------------------------------------------------------------------

describe("exportToPDF (Requirement 9.1)", () => {
  test("returns a non-empty buffer", async () => {
    const result: ExportResult = await exportToPDF(FIXTURE, "notion");
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  test("returns correct filename and mimeType", async () => {
    const result = await exportToPDF(FIXTURE, "notion");
    expect(result.filename).toBe("resume.pdf");
    expect(result.mimeType).toBe("application/pdf");
  });

  test("calls puppeteer launch, setContent, and pdf", async () => {
    await exportToPDF(FIXTURE, "notion");
    // mockBrowser.newPage is called once, setContent and pdf are called on the page
    expect(mockBrowser.newPage).toHaveBeenCalledTimes(1);
    expect(mockPage.setContent).toHaveBeenCalledTimes(1);
    expect(mockPage.pdf).toHaveBeenCalledTimes(1);
    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
  });

  test("HTML passed to setContent includes resume name", async () => {
    await exportToPDF(FIXTURE, "notion");
    const htmlArg: string = mockPage.setContent.mock.calls[0][0];
    expect(htmlArg).toContain("Jane Doe");
  });

  test("HTML includes all major sections", async () => {
    await exportToPDF(FIXTURE, "notion");
    const htmlArg: string = mockPage.setContent.mock.calls[0][0];
    expect(htmlArg).toContain("Summary");
    expect(htmlArg).toContain("Skills");
    expect(htmlArg).toContain("Experience");
    expect(htmlArg).toContain("Education");
    expect(htmlArg).toContain("Projects");
  });

  test("returns placeholder buffer when SKIP_PUPPETEER is set", async () => {
    process.env.SKIP_PUPPETEER = "1";
    const result = await exportToPDF(FIXTURE, "notion");
    expect(result.buffer.toString()).toContain("SKIP_PUPPETEER");
    expect(result.filename).toBe("resume.pdf");
    expect(result.mimeType).toBe("application/pdf");
  });
});

// ---------------------------------------------------------------------------
// DOCX export — Requirement 9.2
// ---------------------------------------------------------------------------

describe("exportToDOCX (Requirement 9.2)", () => {
  test("returns a non-empty buffer", async () => {
    const result: ExportResult = await exportToDOCX(FIXTURE);
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  test("returns correct filename and mimeType", async () => {
    const result = await exportToDOCX(FIXTURE);
    expect(result.filename).toBe("resume.docx");
    expect(result.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });

  test("DOCX buffer starts with PK (ZIP magic bytes)", async () => {
    const result = await exportToDOCX(FIXTURE);
    // DOCX files are ZIP archives — first two bytes are 'PK'
    expect(result.buffer[0]).toBe(0x50); // 'P'
    expect(result.buffer[1]).toBe(0x4b); // 'K'
  });

  test("works with minimal ResumeData (all optional fields null/empty)", async () => {
    const minimal: ResumeData = {
      resumeId: "min-id",
      userId: null,
      personal_info: {
        name: null,
        email: null,
        phone: null,
        location: null,
        website: null,
        linkedin: null,
      },
      summary: null,
      skills: [],
      experience: [],
      projects: [],
      education: [],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    const result = await exportToDOCX(minimal);
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);
  });
});
