// CVio — Version Store Property Tests
// Feature: resume-ai-pro
// Property 23: Version number monotonicity — Validates: Requirements 11.1
// Property 24: Resume list ordering — Validates: Requirements 11.2
// Property 25: Version load round trip — Validates: Requirements 11.3
// Property 26: Version retention minimum — Validates: Requirements 11.4
// Property 27: Deletion removes all versions — Validates: Requirements 11.5

import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Mock firebase-admin before importing versionStore
// ---------------------------------------------------------------------------

/**
 * In-memory Firestore simulation.
 * Structure: store[userId][resumeId][versionId] = versionDoc
 */
type VersionDoc = {
  resumeId: string;
  userId: string;
  data: unknown;
  timestamp: Date;
  versionNumber: number;
};

type Store = Map<string, Map<string, Map<string, VersionDoc>>>;

let store: Store = new Map();

function getVersionsMap(userId: string, resumeId: string): Map<string, VersionDoc> {
  if (!store.has(userId)) store.set(userId, new Map());
  const userMap = store.get(userId)!;
  if (!userMap.has(resumeId)) userMap.set(resumeId, new Map());
  return userMap.get(resumeId)!;
}

let docIdCounter = 0;
function nextDocId(): string {
  return `doc-${++docIdCounter}`;
}

// Build a mock Firestore document reference
function makeMockDocRef(
  userId: string,
  resumeId: string,
  versionId: string
) {
  return {
    id: versionId,
    set: jest.fn(async (data: VersionDoc) => {
      getVersionsMap(userId, resumeId).set(versionId, { ...data });
    }),
    get: jest.fn(async () => {
      const doc = getVersionsMap(userId, resumeId).get(versionId);
      return {
        exists: !!doc,
        id: versionId,
        data: () => doc ? { ...doc, timestamp: { toDate: () => doc.timestamp } } : undefined,
      };
    }),
    delete: jest.fn(async () => {
      getVersionsMap(userId, resumeId).delete(versionId);
    }),
  };
}

// Build a mock collection reference for versions
function makeMockVersionsCollection(userId: string, resumeId: string) {
  const col = {
    doc: jest.fn((id?: string) => {
      const versionId = id ?? nextDocId();
      return makeMockDocRef(userId, resumeId, versionId);
    }),
    orderBy: jest.fn((_field: string, _dir?: string) => col),
    limit: jest.fn((_n: number) => col),
    get: jest.fn(async () => {
      const versionsMap = getVersionsMap(userId, resumeId);
      const docs = Array.from(versionsMap.entries()).map(([id, d]) => ({
        id,
        ref: { delete: jest.fn(async () => versionsMap.delete(id)) },
        data: () => ({ ...d, timestamp: { toDate: () => d.timestamp } }),
      }));

      // Apply orderBy / limit logic captured in the chain
      const field = col.orderBy.mock.calls[col.orderBy.mock.calls.length - 1]?.[0];
      const dir = col.orderBy.mock.calls[col.orderBy.mock.calls.length - 1]?.[1] ?? "asc";
      const limitVal = col.limit.mock.calls[col.limit.mock.calls.length - 1]?.[0];

      let sorted = [...docs];
      if (field) {
        sorted.sort((a, b) => {
          const av = a.data()[field];
          const bv = b.data()[field];
          const aVal = av instanceof Object && "toDate" in av ? av.toDate().getTime() : av;
          const bVal = bv instanceof Object && "toDate" in bv ? bv.toDate().getTime() : bv;
          if (aVal < bVal) return dir === "desc" ? 1 : -1;
          if (aVal > bVal) return dir === "desc" ? -1 : 1;
          return 0;
        });
      }
      if (limitVal !== undefined) sorted = sorted.slice(0, limitVal);

      return { empty: sorted.length === 0, docs: sorted };
    }),
  };
  return col;
}

// Build a mock resume document reference
function makeMockResumeDocRef(userId: string, resumeId: string) {
  return {
    collection: jest.fn((_name: string) =>
      makeMockVersionsCollection(userId, resumeId)
    ),
    set: jest.fn(async () => {}),
    delete: jest.fn(async () => {
      // Remove all versions and the resume entry
      const userMap = store.get(userId);
      if (userMap) userMap.delete(resumeId);
    }),
  };
}

// Build a mock resumes collection
function makeMockResumesCollection(userId: string) {
  return {
    doc: jest.fn((resumeId: string) => makeMockResumeDocRef(userId, resumeId)),
  };
}

// Build a mock users collection
function makeMockUsersCollection() {
  return {
    doc: jest.fn((userId: string) => ({
      collection: jest.fn((_name: string) => makeMockResumesCollection(userId)),
    })),
  };
}

// Top-level mock db
const mockDb = {
  collection: jest.fn((_name: string) => makeMockUsersCollection()),
  batch: jest.fn(() => ({
    delete: jest.fn(),
    commit: jest.fn(async () => {}),
  })),
};

jest.mock("../../firebaseAdmin", () => ({
  adminDb: () => mockDb,
}));

import {
  saveVersion,
  listVersions,
  getVersion,
  deleteResume,
} from "../versionStore";
import type {
  ResumeData,
  PersonalInfo,
  ExperienceEntry,
  EducationEntry,
  ProjectEntry,
} from "../../../types/resume";

// ---------------------------------------------------------------------------
// Helpers — reset store between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  store = new Map();
  docIdCounter = 0;
  jest.clearAllMocks();
  // Re-wire mockDb.collection to always use the fresh store
  mockDb.collection.mockImplementation((_name: string) => makeMockUsersCollection());
  mockDb.batch.mockImplementation(() => {
    const ops: Array<{ ref: { delete: () => Promise<void> } }> = [];
    return {
      delete: jest.fn((ref: { delete: () => Promise<void> }) => ops.push({ ref })),
      commit: jest.fn(async () => {
        for (const op of ops) await op.ref.delete();
      }),
    };
  });
});

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
    company: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 50 })),
    title: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 50 })),
    startDate: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 20 })),
    endDate: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 20 })),
    location: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 50 })),
    bullets: fc.array(fc.string({ minLength: 0, maxLength: 200 }), { maxLength: 5 }),
  });
}

function arbitraryEducationEntry(): fc.Arbitrary<EducationEntry> {
  return fc.record({
    institution: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 50 })),
    degree: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 50 })),
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
    technologies: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 5 }),
    url: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 100 })),
  });
}

function arbitraryResumeData(): fc.Arbitrary<ResumeData> {
  return fc.record({
    resumeId: fc.uuid(),
    userId: fc.oneof(fc.constant(null), fc.uuid()),
    personal_info: arbitraryPersonalInfo(),
    summary: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 300 })),
    skills: fc.array(fc.string({ minLength: 1, maxLength: 40 }), { maxLength: 10 }),
    experience: fc.array(arbitraryExperienceEntry(), { maxLength: 3 }),
    projects: fc.array(arbitraryProjectEntry(), { maxLength: 3 }),
    education: fc.array(arbitraryEducationEntry(), { maxLength: 3 }),
    createdAt: fc.constant("2024-01-01T00:00:00.000Z"),
    updatedAt: fc.constant("2024-01-01T00:00:00.000Z"),
  });
}

// ---------------------------------------------------------------------------
// Property 23: Version number monotonicity
// Validates: Requirements 11.1
// ---------------------------------------------------------------------------

describe("CVio — Property 23: Version number monotonicity", () => {
  /**
   * For any sequence of saves to the same resumeId, each successive
   * ResumeVersion.versionNumber must be strictly greater than the previous one.
   */
  test("successive saves produce strictly increasing versionNumbers", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.array(arbitraryResumeData(), { minLength: 2, maxLength: 5 }),
        async (userId, resumeId, dataList) => {
          // Reset store for each property run
          store = new Map();
          docIdCounter = 0;
          mockDb.collection.mockImplementation((_name: string) =>
            makeMockUsersCollection()
          );

          const versions = [];
          for (const data of dataList) {
            const v = await saveVersion(userId, resumeId, data);
            versions.push(v);
          }

          // Each successive versionNumber must be strictly greater
          for (let i = 1; i < versions.length; i++) {
            if (versions[i].versionNumber <= versions[i - 1].versionNumber) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("first save always gets versionNumber 1", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        arbitraryResumeData(),
        async (userId, resumeId, data) => {
          store = new Map();
          docIdCounter = 0;
          mockDb.collection.mockImplementation((_name: string) =>
            makeMockUsersCollection()
          );

          const v = await saveVersion(userId, resumeId, data);
          return v.versionNumber === 1;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 24: Resume list ordering
// Validates: Requirements 11.2
// ---------------------------------------------------------------------------

describe("CVio — Property 24: Resume list ordering", () => {
  /**
   * For any set of saved resumes, listVersions returns versions ordered by
   * timestamp descending — the most recently saved version appears first.
   */
  test("listVersions returns versions ordered by timestamp descending", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.array(arbitraryResumeData(), { minLength: 2, maxLength: 6 }),
        async (userId, resumeId, dataList) => {
          store = new Map();
          docIdCounter = 0;
          mockDb.collection.mockImplementation((_name: string) =>
            makeMockUsersCollection()
          );

          for (const data of dataList) {
            await saveVersion(userId, resumeId, data);
          }

          const versions = await listVersions(userId, resumeId);

          // Verify descending order by timestamp
          for (let i = 1; i < versions.length; i++) {
            if (versions[i].timestamp > versions[i - 1].timestamp) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("listVersions returns all saved versions", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.array(arbitraryResumeData(), { minLength: 1, maxLength: 6 }),
        async (userId, resumeId, dataList) => {
          store = new Map();
          docIdCounter = 0;
          mockDb.collection.mockImplementation((_name: string) =>
            makeMockUsersCollection()
          );

          for (const data of dataList) {
            await saveVersion(userId, resumeId, data);
          }

          const versions = await listVersions(userId, resumeId);
          return versions.length === dataList.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 25: Version load round trip
// Validates: Requirements 11.3
// ---------------------------------------------------------------------------

describe("CVio — Property 25: Version load round trip", () => {
  /**
   * For any ResumeData saved via saveVersion, retrieving it via getVersion
   * must produce a ResumeData deeply equal to the one saved.
   */
  test("getVersion returns the exact ResumeData that was saved", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        arbitraryResumeData(),
        async (userId, resumeId, data) => {
          store = new Map();
          docIdCounter = 0;
          mockDb.collection.mockImplementation((_name: string) =>
            makeMockUsersCollection()
          );

          const saved = await saveVersion(userId, resumeId, data);
          const loaded = await getVersion(userId, resumeId, saved.versionId);

          // Deep equality check on the ResumeData
          return JSON.stringify(loaded.data) === JSON.stringify(saved.data);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("getVersion returns correct metadata (versionId, versionNumber, userId, resumeId)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        arbitraryResumeData(),
        async (userId, resumeId, data) => {
          store = new Map();
          docIdCounter = 0;
          mockDb.collection.mockImplementation((_name: string) =>
            makeMockUsersCollection()
          );

          const saved = await saveVersion(userId, resumeId, data);
          const loaded = await getVersion(userId, resumeId, saved.versionId);

          return (
            loaded.versionId === saved.versionId &&
            loaded.versionNumber === saved.versionNumber &&
            loaded.userId === userId &&
            loaded.resumeId === resumeId
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 26: Version retention minimum
// Validates: Requirements 11.4
// ---------------------------------------------------------------------------

describe("CVio — Property 26: Version retention minimum", () => {
  /**
   * For any resume saved at least 10 times, listVersions must return
   * at least 10 version entries.
   */
  test("after 10 or more saves, listVersions returns at least 10 versions", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 10, max: 15 }),
        arbitraryResumeData(),
        async (userId, resumeId, saveCount, baseData) => {
          store = new Map();
          docIdCounter = 0;
          mockDb.collection.mockImplementation((_name: string) =>
            makeMockUsersCollection()
          );

          for (let i = 0; i < saveCount; i++) {
            await saveVersion(userId, resumeId, { ...baseData, updatedAt: new Date(i).toISOString() });
          }

          const versions = await listVersions(userId, resumeId);
          return versions.length >= 10;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 27: Deletion removes all versions
// Validates: Requirements 11.5
// ---------------------------------------------------------------------------

describe("CVio — Property 27: Deletion removes all versions", () => {
  /**
   * After calling deleteResume, calling listVersions for that resumeId
   * must return an empty array.
   */
  test("after deleteResume, listVersions returns an empty array", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.array(arbitraryResumeData(), { minLength: 1, maxLength: 6 }),
        async (userId, resumeId, dataList) => {
          store = new Map();
          docIdCounter = 0;
          mockDb.collection.mockImplementation((_name: string) =>
            makeMockUsersCollection()
          );

          for (const data of dataList) {
            await saveVersion(userId, resumeId, data);
          }

          await deleteResume(userId, resumeId);

          const versions = await listVersions(userId, resumeId);
          return versions.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("deleteResume does not affect versions of other resumes", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.tuple(fc.uuid(), fc.uuid()).filter(([a, b]) => a !== b),
        arbitraryResumeData(),
        arbitraryResumeData(),
        async (userId, [resumeIdA, resumeIdB], dataA, dataB) => {
          store = new Map();
          docIdCounter = 0;
          mockDb.collection.mockImplementation((_name: string) =>
            makeMockUsersCollection()
          );

          await saveVersion(userId, resumeIdA, dataA);
          await saveVersion(userId, resumeIdB, dataB);

          await deleteResume(userId, resumeIdA);

          const versionsB = await listVersions(userId, resumeIdB);
          return versionsB.length === 1;
        }
      ),
      { numRuns: 100 }
    );
  });
});
