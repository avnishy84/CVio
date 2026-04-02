// CVio — ATS Scorer Property Tests
// Properties 8, 9, 10, 11 — Validates: Requirements 4.1, 4.2, 4.4, 4.5, 4.6

import * as fc from "fast-check";
import { scoreResume } from "../atsScorer";
import type {
  ResumeData,
  PersonalInfo,
  ExperienceEntry,
  EducationEntry,
  ProjectEntry,
} from "../../../types/resume";

// ---------------------------------------------------------------------------
// Arbitrary generators
// ---------------------------------------------------------------------------

/** Generates a valid PersonalInfo object */
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

/** Generates a valid ExperienceEntry */
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

/** Generates a valid EducationEntry */
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

/** Generates a valid ProjectEntry */
function arbitraryProjectEntry(): fc.Arbitrary<ProjectEntry> {
  return fc.record({
    name: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 50 })),
    description: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 200 })),
    technologies: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }),
    url: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 100 })),
  });
}

/** Generates a valid ResumeData object with all required fields */
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
// Property 8: ATS score weighted sum invariant
// Validates: Requirements 4.1, 4.2
// ---------------------------------------------------------------------------

describe("CVio — Property 8: ATS score weighted sum invariant", () => {
  /**
   * For any ResumeData and optional Job_Description, ATSResult.score must equal
   * the sum of all six breakdown category values, and total must be in range [0, 100].
   */
  test("score equals sum of all six breakdown categories and is in [0, 100]", () => {
    fc.assert(
      fc.property(
        arbitraryResumeData(),
        fc.oneof(fc.constant(undefined), fc.string({ maxLength: 500 })),
        (data, jobDescription) => {
          const result = scoreResume(data, jobDescription);
          const { breakdown } = result;

          const sum =
            breakdown.keywordMatch +
            breakdown.formattingReadability +
            breakdown.sectionCompleteness +
            breakdown.impactMetrics +
            breakdown.skillsRelevance +
            breakdown.experienceDepth;

          return result.score === sum && result.score >= 0 && result.score <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("score is in [0, 100] with no job description", () => {
    fc.assert(
      fc.property(arbitraryResumeData(), (data) => {
        const result = scoreResume(data);
        return result.score >= 0 && result.score <= 100;
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: ATS low-score suggestions
// Validates: Requirements 4.4
// ---------------------------------------------------------------------------

describe("CVio — Property 9: ATS low-score suggestions", () => {
  /**
   * For any inputs that produce ATSResult.score strictly less than 80,
   * suggestions array must contain at least 3 elements.
   */
  test("when score < 80, suggestions has at least 3 elements", () => {
    fc.assert(
      fc.property(
        arbitraryResumeData(),
        fc.oneof(fc.constant(undefined), fc.string({ maxLength: 500 })),
        (data, jobDescription) => {
          const result = scoreResume(data, jobDescription);

          if (result.score < 80) {
            return result.suggestions.length >= 3;
          }
          // score >= 80: no constraint on suggestions count
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: ATS no-job-description behavior
// Validates: Requirements 4.5
// ---------------------------------------------------------------------------

describe("CVio — Property 10: ATS no-job-description behavior", () => {
  /**
   * For any ResumeData scored without a Job_Description,
   * ATSResult.breakdown.keywordMatch must equal 0 and
   * ATSResult.keywordMatchingSkipped must be true.
   */
  test("without job description: keywordMatch is 0 and keywordMatchingSkipped is true", () => {
    fc.assert(
      fc.property(arbitraryResumeData(), (data) => {
        const result = scoreResume(data);
        return result.breakdown.keywordMatch === 0 && result.keywordMatchingSkipped === true;
      }),
      { numRuns: 100 }
    );
  });

  test("with empty string job description: keywordMatch is 0 and keywordMatchingSkipped is true", () => {
    fc.assert(
      fc.property(arbitraryResumeData(), (data) => {
        const result = scoreResume(data, "");
        return result.breakdown.keywordMatch === 0 && result.keywordMatchingSkipped === true;
      }),
      { numRuns: 100 }
    );
  });

  test("with whitespace-only job description: keywordMatch is 0 and keywordMatchingSkipped is true", () => {
    fc.assert(
      fc.property(
        arbitraryResumeData(),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim() === ""),
        (data, whitespace) => {
          const result = scoreResume(data, whitespace);
          return result.breakdown.keywordMatch === 0 && result.keywordMatchingSkipped === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: ATS scorer determinism
// Validates: Requirements 4.6
// ---------------------------------------------------------------------------

describe("CVio — Property 11: ATS scorer determinism", () => {
  /**
   * For any fixed ResumeData and fixed Job_Description (or absence thereof),
   * calling scoreResume multiple times must always return identical ATSResult.score
   * and identical breakdown values.
   */
  test("same inputs always produce identical score and breakdown (with job description)", () => {
    fc.assert(
      fc.property(
        arbitraryResumeData(),
        fc.string({ minLength: 1, maxLength: 500 }),
        (data, jobDescription) => {
          const result1 = scoreResume(data, jobDescription);
          const result2 = scoreResume(data, jobDescription);
          const result3 = scoreResume(data, jobDescription);

          return (
            result1.score === result2.score &&
            result2.score === result3.score &&
            result1.breakdown.keywordMatch === result2.breakdown.keywordMatch &&
            result2.breakdown.keywordMatch === result3.breakdown.keywordMatch &&
            result1.breakdown.formattingReadability === result2.breakdown.formattingReadability &&
            result2.breakdown.formattingReadability === result3.breakdown.formattingReadability &&
            result1.breakdown.sectionCompleteness === result2.breakdown.sectionCompleteness &&
            result2.breakdown.sectionCompleteness === result3.breakdown.sectionCompleteness &&
            result1.breakdown.impactMetrics === result2.breakdown.impactMetrics &&
            result2.breakdown.impactMetrics === result3.breakdown.impactMetrics &&
            result1.breakdown.skillsRelevance === result2.breakdown.skillsRelevance &&
            result2.breakdown.skillsRelevance === result3.breakdown.skillsRelevance &&
            result1.breakdown.experienceDepth === result2.breakdown.experienceDepth &&
            result2.breakdown.experienceDepth === result3.breakdown.experienceDepth
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test("same inputs always produce identical score and breakdown (without job description)", () => {
    fc.assert(
      fc.property(arbitraryResumeData(), (data) => {
        const result1 = scoreResume(data);
        const result2 = scoreResume(data);

        return (
          result1.score === result2.score &&
          result1.breakdown.keywordMatch === result2.breakdown.keywordMatch &&
          result1.breakdown.formattingReadability === result2.breakdown.formattingReadability &&
          result1.breakdown.sectionCompleteness === result2.breakdown.sectionCompleteness &&
          result1.breakdown.impactMetrics === result2.breakdown.impactMetrics &&
          result1.breakdown.skillsRelevance === result2.breakdown.skillsRelevance &&
          result1.breakdown.experienceDepth === result2.breakdown.experienceDepth
        );
      }),
      { numRuns: 100 }
    );
  });
});
