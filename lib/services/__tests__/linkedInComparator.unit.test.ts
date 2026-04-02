// CVio — LinkedIn Comparator Unit Tests
// Validates: Requirements 7.1 — URL and PDF input types are both accepted

import type { ResumeData } from "../../../types/resume";

// ---------------------------------------------------------------------------
// Mocks
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
// Fixtures
// ---------------------------------------------------------------------------

const baseResumeData: ResumeData = {
  resumeId: "resume-001",
  userId: "user-001",
  personal_info: {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "555-1234",
    location: "San Francisco, CA",
    website: null,
    linkedin: "https://linkedin.com/in/janedoe",
  },
  summary: "Experienced software engineer with 5 years in full-stack development.",
  skills: ["TypeScript", "React", "Node.js"],
  experience: [
    {
      company: "Acme Corp",
      title: "Senior Engineer",
      startDate: "2020-01",
      endDate: "Present",
      location: "Remote",
      bullets: ["Led team of 5 engineers", "Reduced latency by 40%"],
    },
  ],
  projects: [],
  education: [
    {
      institution: "State University",
      degree: "B.S.",
      field: "Computer Science",
      startDate: "2014-09",
      endDate: "2018-05",
      gpa: "3.8",
    },
  ],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const linkedInExtractedData = {
  personal_info: { name: "Jane Doe", email: "jane@example.com", phone: null, location: null, website: null, linkedin: null },
  summary: "Software engineer with 5 years experience.",
  skills: ["TypeScript", "React", "Node.js", "GraphQL"],
  experience: [
    {
      company: "Acme Corp",
      title: "Lead Engineer", // differs from resume
      startDate: "2020-01",
      endDate: "Present",
      location: "Remote",
      bullets: [],
    },
  ],
  projects: [],
  education: [
    {
      institution: "State University",
      degree: "B.S.",
      field: "Computer Science",
      startDate: "2014-09",
      endDate: "2018-05",
      gpa: null,
    },
  ],
};

const comparisonResponse = {
  inconsistencies: [
    {
      field: "experience[0].title",
      resumeValue: "Senior Engineer",
      linkedInValue: "Lead Engineer",
      priority: "high",
    },
  ],
  resumeSuggestions: ["Update your job title to match LinkedIn"],
  linkedInSuggestions: ["Update LinkedIn title to match resume"],
};

// ---------------------------------------------------------------------------
// Helper: simulate a successful https.get response
// ---------------------------------------------------------------------------

function mockSuccessfulHttpsGet(body: string) {
  mockHttpsGet.mockImplementation((_url: unknown, callback?: unknown) => {
    const cb = callback as (res: object) => void;
    const chunks: Array<(chunk: Buffer) => void> = [];
    const endHandlers: Array<() => void> = [];

    const fakeRes = {
      statusCode: 200,
      headers: {},
      on: (event: string, handler: unknown) => {
        if (event === "data") chunks.push(handler as (chunk: Buffer) => void);
        if (event === "end") endHandlers.push(handler as () => void);
        if (event === "error") { /* no-op */ }
        return fakeRes;
      },
    };

    setImmediate(() => {
      if (cb) cb(fakeRes);
      setImmediate(() => {
        chunks.forEach((h) => h(Buffer.from(body)));
        endHandlers.forEach((h) => h());
      });
    });

    return {
      on: (_event: string, _handler: unknown) => ({ on: () => ({}) }),
      setTimeout: () => ({ on: () => ({}) }),
      destroy: () => ({}),
    } as never;
  });
}

// ---------------------------------------------------------------------------
// Tests: Requirement 7.1 — URL input type accepted
// ---------------------------------------------------------------------------

describe("CVio — LinkedIn Comparator: URL input type accepted (Requirement 7.1)", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockHttpsGet.mockReset();
  });

  test("accepts a URL source and returns a ComparisonResult without error", async () => {
    mockSuccessfulHttpsGet("Jane Doe | Senior Engineer at Acme Corp | LinkedIn");

    let callCount = 0;
    mockCreate.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { choices: [{ message: { content: JSON.stringify(linkedInExtractedData) } }] };
      }
      return { choices: [{ message: { content: JSON.stringify(comparisonResponse) } }] };
    });

    const result = await compareWithLinkedIn(baseResumeData, {
      type: "url",
      value: "https://linkedin.com/in/janedoe",
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.inconsistencies)).toBe(true);
    expect(Array.isArray(result.resumeSuggestions)).toBe(true);
    expect(Array.isArray(result.linkedInSuggestions)).toBe(true);
    // No error on success
    expect((result as { error?: string }).error).toBeUndefined();
  });

  test("returns error result when URL is empty string", async () => {
    const result = await compareWithLinkedIn(baseResumeData, {
      type: "url",
      value: "",
    });

    expect((result as { error?: string }).error).toBeDefined();
    expect(result.inconsistencies).toHaveLength(0);
  });

  test("returns error result when URL fetch fails (network error)", async () => {
    mockHttpsGet.mockImplementation((_url: unknown, _cb?: unknown) => {
      const fakeReq = {
        on: (event: string, handler: (err: Error) => void) => {
          if (event === "error") {
            setImmediate(() => handler(new Error("ENOTFOUND: DNS resolution failed")));
          }
          return fakeReq;
        },
        setTimeout: (_ms: number, _cb: () => void) => fakeReq,
        destroy: (_err?: Error) => fakeReq,
      };
      return fakeReq as never;
    });

    const result = await compareWithLinkedIn(baseResumeData, {
      type: "url",
      value: "https://linkedin.com/in/nonexistent",
    });

    expect((result as { error?: string }).error).toBeDefined();
    expect(result.inconsistencies).toHaveLength(0);
    expect(result.resumeSuggestions).toHaveLength(0);
    expect(result.linkedInSuggestions).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: Requirement 7.1 — PDF input type accepted
// ---------------------------------------------------------------------------

describe("CVio — LinkedIn Comparator: PDF input type accepted (Requirement 7.1)", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockPdfParse.mockReset();
  });

  test("accepts a PDF Buffer source and returns a ComparisonResult without error", async () => {
    mockPdfParse.mockResolvedValue({
      text: "Jane Doe | Senior Engineer at Acme Corp",
      numpages: 2,
      numrender: 2,
      info: {},
      metadata: {},
      version: "1.0",
    } as never);

    let callCount = 0;
    mockCreate.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { choices: [{ message: { content: JSON.stringify(linkedInExtractedData) } }] };
      }
      return { choices: [{ message: { content: JSON.stringify(comparisonResponse) } }] };
    });

    const pdfBuffer = Buffer.from("%PDF-1.4 fake pdf content");

    const result = await compareWithLinkedIn(baseResumeData, {
      type: "pdf",
      value: pdfBuffer,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.inconsistencies)).toBe(true);
    expect(Array.isArray(result.resumeSuggestions)).toBe(true);
    expect(Array.isArray(result.linkedInSuggestions)).toBe(true);
    expect((result as { error?: string }).error).toBeUndefined();
  });

  test("returns error result when PDF cannot be parsed", async () => {
    mockPdfParse.mockRejectedValue(new Error("Invalid PDF structure"));

    const result = await compareWithLinkedIn(baseResumeData, {
      type: "pdf",
      value: Buffer.from("not a real pdf"),
    });

    expect((result as { error?: string }).error).toBeDefined();
    expect(result.inconsistencies).toHaveLength(0);
  });

  test("returns error result when PDF yields empty text", async () => {
    mockPdfParse.mockResolvedValue({
      text: "   ",
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: {},
      version: "1.0",
    } as never);

    const result = await compareWithLinkedIn(baseResumeData, {
      type: "pdf",
      value: Buffer.from("%PDF-1.4 empty"),
    });

    expect((result as { error?: string }).error).toBeDefined();
    expect(result.inconsistencies).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: importLinkedInFields — pure function behaviour
// ---------------------------------------------------------------------------

describe("CVio — LinkedIn Comparator: importLinkedInFields", () => {
  test("overwrites only the selected fields with LinkedIn values", () => {
    const linkedInData: Partial<ResumeData> = {
      skills: ["TypeScript", "React", "GraphQL", "Docker"],
      summary: "Updated LinkedIn summary.",
    };

    const result = importLinkedInFields(baseResumeData, linkedInData, ["skills"]);

    expect(result.skills).toEqual(["TypeScript", "React", "GraphQL", "Docker"]);
    // summary should remain from original
    expect(result.summary).toBe(baseResumeData.summary);
    // experience unchanged
    expect(result.experience).toEqual(baseResumeData.experience);
  });

  test("overwrites multiple selected fields", () => {
    const linkedInData: Partial<ResumeData> = {
      skills: ["Python", "Django"],
      summary: "Python developer.",
    };

    const result = importLinkedInFields(baseResumeData, linkedInData, ["skills", "summary"]);

    expect(result.skills).toEqual(["Python", "Django"]);
    expect(result.summary).toBe("Python developer.");
    expect(result.experience).toEqual(baseResumeData.experience);
  });

  test("does not mutate the original ResumeData", () => {
    const originalSkills = [...baseResumeData.skills];
    const linkedInData: Partial<ResumeData> = { skills: ["Go", "Rust"] };

    importLinkedInFields(baseResumeData, linkedInData, ["skills"]);

    expect(baseResumeData.skills).toEqual(originalSkills);
  });

  test("returns a new object (not the same reference)", () => {
    const linkedInData: Partial<ResumeData> = { skills: ["Go"] };
    const result = importLinkedInFields(baseResumeData, linkedInData, ["skills"]);
    expect(result).not.toBe(baseResumeData);
  });

  test("when selectedFields is empty, returns a copy identical to original", () => {
    const linkedInData: Partial<ResumeData> = { skills: ["Go"] };
    const result = importLinkedInFields(baseResumeData, linkedInData, []);
    expect(JSON.stringify(result)).toBe(JSON.stringify(baseResumeData));
  });
});
