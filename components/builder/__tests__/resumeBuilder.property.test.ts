/**
 * CVio — ResumeBuilder Reducer Property Tests
 * Feature: resume-ai-pro
 * Property 18: Inline edit state consistency — Validates: Requirements 8.2
 * Property 19: Section regeneration isolation — Validates: Requirements 8.3
 * Property 20: Template switch preserves data — Validates: Requirements 8.4
 */

import * as fc from "fast-check";
import type {
  ResumeData,
  PersonalInfo,
  ExperienceEntry,
  EducationEntry,
  ProjectEntry,
} from "../../../types/resume";
import { builderReducer, BuilderState } from "../ResumeBuilder";

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
    bullets: fc.array(fc.string({ minLength: 0, maxLength: 200 }), { maxLength: 8 }),
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

function arbitraryBuilderState(): fc.Arbitrary<BuilderState> {
  return fc.record({
    data: arbitraryResumeData(),
    template: fc.constantFrom("notion", "apple", "ats-friendly"),
    regenerating: fc.constant({}),
  });
}

/** The data-bearing sections of ResumeData that UPDATE_FIELD can target */
const DATA_SECTIONS: (keyof ResumeData)[] = [
  "summary",
  "skills",
  "experience",
  "education",
  "projects",
  "personal_info",
];

// ---------------------------------------------------------------------------
// Property 18: Inline edit state consistency
// Validates: Requirements 8.2
// ---------------------------------------------------------------------------

describe("CVio — Property 18: Inline edit state consistency", () => {
  /**
   * **Validates: Requirements 8.2**
   *
   * For any ResumeData state and any field edit operation, after the edit the
   * builder's internal state must reflect the new value at the edited field path,
   * and all other field paths must be unchanged.
   */
  test("after UPDATE_FIELD, edited section has new value and all others are unchanged", () => {
    fc.assert(
      fc.property(
        arbitraryBuilderState(),
        fc.constantFrom(...DATA_SECTIONS),
        fc.string({ minLength: 0, maxLength: 200 }),
        (state, section, newValue) => {
          const nextState = builderReducer(state, {
            type: "UPDATE_FIELD",
            section,
            value: newValue,
          });

          // The edited section must have the new value
          if (JSON.stringify(nextState.data[section]) !== JSON.stringify(newValue)) {
            return false;
          }

          // All other sections must be unchanged
          for (const key of DATA_SECTIONS) {
            if (key !== section) {
              if (JSON.stringify(nextState.data[key]) !== JSON.stringify(state.data[key])) {
                return false;
              }
            }
          }

          // Non-section fields (resumeId, userId, createdAt) must be unchanged
          if (nextState.data.resumeId !== state.data.resumeId) return false;
          if (nextState.data.userId !== state.data.userId) return false;
          if (nextState.data.createdAt !== state.data.createdAt) return false;

          // Template must be unchanged
          if (nextState.template !== state.template) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("UPDATE_FIELD does not mutate the original state object", () => {
    fc.assert(
      fc.property(
        arbitraryBuilderState(),
        fc.constantFrom(...DATA_SECTIONS),
        fc.string({ minLength: 0, maxLength: 100 }),
        (state, section, newValue) => {
          const originalSnapshot = JSON.stringify(state);
          builderReducer(state, { type: "UPDATE_FIELD", section, value: newValue });
          return JSON.stringify(state) === originalSnapshot;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 19: Section regeneration isolation
// Validates: Requirements 8.3
// ---------------------------------------------------------------------------

describe("CVio — Property 19: Section regeneration isolation", () => {
  /**
   * **Validates: Requirements 8.3**
   *
   * For any ResumeData and any target section key, after section-wise regeneration
   * the resulting ResumeData must have all sections except the targeted one
   * identical to the original.
   */
  test("after REGENERATE_SECTION, only the targeted section changes", () => {
    fc.assert(
      fc.property(
        arbitraryBuilderState(),
        fc.constantFrom(...DATA_SECTIONS),
        fc.string({ minLength: 0, maxLength: 200 }),
        (state, section, regeneratedContent) => {
          const nextState = builderReducer(state, {
            type: "REGENERATE_SECTION",
            section,
            content: regeneratedContent,
          });

          // The targeted section must have the regenerated content
          if (JSON.stringify(nextState.data[section]) !== JSON.stringify(regeneratedContent)) {
            return false;
          }

          // All other sections must be identical to the original
          for (const key of DATA_SECTIONS) {
            if (key !== section) {
              if (JSON.stringify(nextState.data[key]) !== JSON.stringify(state.data[key])) {
                return false;
              }
            }
          }

          // Metadata fields must be unchanged
          if (nextState.data.resumeId !== state.data.resumeId) return false;
          if (nextState.data.userId !== state.data.userId) return false;
          if (nextState.data.createdAt !== state.data.createdAt) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("REGENERATE_SECTION does not mutate the original state object", () => {
    fc.assert(
      fc.property(
        arbitraryBuilderState(),
        fc.constantFrom(...DATA_SECTIONS),
        fc.string({ minLength: 0, maxLength: 100 }),
        (state, section, content) => {
          const originalSnapshot = JSON.stringify(state);
          builderReducer(state, { type: "REGENERATE_SECTION", section, content });
          return JSON.stringify(state) === originalSnapshot;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 20: Template switch preserves data
// Validates: Requirements 8.4
// ---------------------------------------------------------------------------

describe("CVio — Property 20: Template switch preserves data", () => {
  /**
   * **Validates: Requirements 8.4**
   *
   * For any ResumeData and any sequence of template switches, the ResumeData
   * object held in builder state must be identical before and after each switch.
   */
  test("after SWITCH_TEMPLATE, ResumeData is identical to before the switch", () => {
    fc.assert(
      fc.property(
        arbitraryBuilderState(),
        fc.constantFrom("notion", "apple", "ats-friendly"),
        (state, newTemplate) => {
          const dataSnapshot = JSON.stringify(state.data);

          const nextState = builderReducer(state, {
            type: "SWITCH_TEMPLATE",
            template: newTemplate,
          });

          // Data must be byte-for-byte identical
          if (JSON.stringify(nextState.data) !== dataSnapshot) return false;

          // Template must have changed to the new value
          if (nextState.template !== newTemplate) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("sequence of template switches never alters ResumeData", () => {
    fc.assert(
      fc.property(
        arbitraryBuilderState(),
        fc.array(fc.constantFrom("notion", "apple", "ats-friendly"), { minLength: 1, maxLength: 10 }),
        (initialState, templateSequence) => {
          const dataSnapshot = JSON.stringify(initialState.data);
          let current = initialState;

          for (const tpl of templateSequence) {
            current = builderReducer(current, { type: "SWITCH_TEMPLATE", template: tpl });
          }

          return JSON.stringify(current.data) === dataSnapshot;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("SWITCH_TEMPLATE does not mutate the original state object", () => {
    fc.assert(
      fc.property(
        arbitraryBuilderState(),
        fc.constantFrom("notion", "apple", "ats-friendly"),
        (state, newTemplate) => {
          const originalSnapshot = JSON.stringify(state);
          builderReducer(state, { type: "SWITCH_TEMPLATE", template: newTemplate });
          return JSON.stringify(state) === originalSnapshot;
        }
      ),
      { numRuns: 100 }
    );
  });
});
