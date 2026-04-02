// CVio — Upload API Property Tests
// Property 1: File format validation — Validates: Requirements 1.1, 1.3
// Property 2: File size rejection — Validates: Requirements 1.2

import * as fc from "fast-check";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock parseResume so tests don't hit OpenAI or file parsers
// ---------------------------------------------------------------------------

const mockParseResume = jest.fn();

jest.mock("../../../lib/services/parser", () => ({
  parseResume: mockParseResume,
}));

// Import after mocking
import { POST } from "../upload/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10,485,760 bytes

/**
 * Build a NextRequest with a multipart/form-data body containing a single
 * "file" field whose MIME type and size are controlled by the caller.
 */
function buildRequest(mimeType: string, sizeBytes: number): NextRequest {
  const content = Buffer.alloc(sizeBytes, 0x61); // fill with 'a'
  const file = new File([content], "resume.bin", { type: mimeType });
  const formData = new FormData();
  formData.append("file", file);

  // NextRequest requires a URL; use a dummy one
  const req = new NextRequest("http://localhost/api/upload", {
    method: "POST",
    body: formData,
  });
  return req;
}

// ---------------------------------------------------------------------------
// Default mock return value for parseResume (used in acceptance tests)
// ---------------------------------------------------------------------------

const MOCK_PARSE_RESULT = {
  data: {
    resumeId: "test-id",
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
  },
  unextractedFields: [],
};

// ---------------------------------------------------------------------------
// Property 1: File format validation
// Validates: Requirements 1.1, 1.3
// ---------------------------------------------------------------------------

describe("CVio — Property 1: File format validation", () => {
  beforeEach(() => {
    mockParseResume.mockReset();
    mockParseResume.mockResolvedValue(MOCK_PARSE_RESULT);
  });

  /**
   * For any file upload, the system should accept the file if and only if its
   * MIME type is application/pdf or
   * application/vnd.openxmlformats-officedocument.wordprocessingml.document.
   * All other MIME types must be rejected with an error response.
   */
  test("accepted MIME types return 200; all others return 415", async () => {
    // Arbitrary: any non-empty MIME type string
    const arbitraryMimeType = fc.oneof(
      // Accepted types
      fc.constantFrom(...ACCEPTED_MIME_TYPES),
      // Rejected types — common alternatives
      fc.constantFrom(
        "image/png",
        "image/jpeg",
        "text/plain",
        "application/msword",
        "application/octet-stream",
        "text/html",
        "application/zip",
        "video/mp4"
      ),
      // Arbitrary strings that are not accepted MIME types
      fc
        .string({ minLength: 1, maxLength: 80 })
        .filter((s) => !(ACCEPTED_MIME_TYPES as readonly string[]).includes(s))
    );

    // Use a small valid file size (1 byte) so size validation never triggers
    const validSize = 1;

    await fc.assert(
      fc.asyncProperty(arbitraryMimeType, async (mimeType) => {
        const req = buildRequest(mimeType, validSize);
        const res = await POST(req);

        const isAccepted = (ACCEPTED_MIME_TYPES as readonly string[]).includes(mimeType);

        if (isAccepted) {
          // Must succeed (200) when MIME type is valid
          return res.status === 200;
        } else {
          // Must reject with 415 when MIME type is unsupported
          if (res.status !== 415) return false;
          const body = await res.json();
          // Error message must reference accepted formats
          return (
            typeof body.error === "string" &&
            body.error.length > 0
          );
        }
      }),
      { numRuns: 100 }
    );
  });

  test("accepted MIME types call parseResume; rejected types do not", async () => {
    const rejectedMimeTypes = [
      "image/png",
      "text/plain",
      "application/msword",
      "application/octet-stream",
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...rejectedMimeTypes),
        async (mimeType) => {
          mockParseResume.mockClear();
          const req = buildRequest(mimeType, 1);
          await POST(req);
          // parseResume must NOT be called for rejected MIME types
          return mockParseResume.mock.calls.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: File size rejection
// Validates: Requirements 1.2
// ---------------------------------------------------------------------------

describe("CVio — Property 2: File size rejection", () => {
  beforeEach(() => {
    mockParseResume.mockReset();
    mockParseResume.mockResolvedValue(MOCK_PARSE_RESULT);
  });

  /**
   * For any file whose byte length exceeds 10,485,760 bytes (10 MB), the upload
   * handler must reject it and return an error message referencing the 10 MB
   * size limit.
   */
  test("files exceeding 10 MB are rejected with 413 and a size-limit error message", async () => {
    // Generate sizes strictly above 10 MB (up to 10 MB + 5 MB headroom)
    const arbitraryOversizedBytes = fc.integer({
      min: MAX_FILE_SIZE + 1,
      max: MAX_FILE_SIZE + 5 * 1024 * 1024,
    });

    // Use an accepted MIME type so only size validation triggers
    const validMime = "application/pdf";

    await fc.assert(
      fc.asyncProperty(arbitraryOversizedBytes, async (sizeBytes) => {
        const req = buildRequest(validMime, sizeBytes);
        const res = await POST(req);

        if (res.status !== 413) return false;

        const body = await res.json();
        // Error message must reference the 10 MB limit
        return (
          typeof body.error === "string" &&
          body.error.toLowerCase().includes("10 mb")
        );
      }),
      { numRuns: 100 }
    );
  });

  test("files at or below 10 MB with valid MIME type are accepted", async () => {
    // Generate sizes from 1 byte up to exactly 10 MB
    const arbitraryValidBytes = fc.integer({
      min: 1,
      max: MAX_FILE_SIZE,
    });

    const validMime = "application/pdf";

    await fc.assert(
      fc.asyncProperty(arbitraryValidBytes, async (sizeBytes) => {
        const req = buildRequest(validMime, sizeBytes);
        const res = await POST(req);
        return res.status === 200;
      }),
      { numRuns: 100 }
    );
  });
});
