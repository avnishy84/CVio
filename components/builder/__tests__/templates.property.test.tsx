/**
 * CVio — Template Rendering Property Tests
 * Feature: resume-ai-pro
 * Property 17: Template rendering succeeds for all valid inputs
 * Validates: Requirements 8.1
 */

import * as fc from "fast-check";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  ResumeData,
  PersonalInfo,
  ExperienceEntry,
  EducationEntry,
  ProjectEntry,
} from "../../../types/resume";
import NotionTemplate from "../templates/NotionTemplate";
import AppleTemplate from "../templates/AppleTemplate";
import ATSFriendlyTemplate from "../templates/ATSFriendlyTemplate";

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

// ---------------------------------------------------------------------------
// Template render helpers
// ---------------------------------------------------------------------------

type TemplateName = "notion" | "apple" | "ats-friendly";

function renderTemplate(name: TemplateName, data: ResumeData): string {
  switch (name) {
    case "notion":
      return renderToStaticMarkup(React.createElement(NotionTemplate, { data }));
    case "apple":
      return renderToStaticMarkup(React.createElement(AppleTemplate, { data }));
    case "ats-friendly":
      return renderToStaticMarkup(React.createElement(ATSFriendlyTemplate, { data }));
  }
}

const TEMPLATE_NAMES: TemplateName[] = ["notion", "apple", "ats-friendly"];

// ---------------------------------------------------------------------------
// Property 17: Template rendering succeeds for all valid inputs
// Validates: Requirements 8.1
// ---------------------------------------------------------------------------

describe("CVio — Property 17: Template rendering succeeds for all valid inputs", () => {
  /**
   * **Validates: Requirements 8.1**
   *
   * For any ResumeData and any of the three template names, calling the render
   * function must return a non-empty HTML string without throwing an exception.
   */
  test("all three templates render non-empty HTML for any valid ResumeData", () => {
    fc.assert(
      fc.property(
        arbitraryResumeData(),
        fc.constantFrom(...TEMPLATE_NAMES),
        (data, templateName) => {
          let html: string;
          try {
            html = renderTemplate(templateName, data);
          } catch (err) {
            // Must not throw
            return false;
          }
          // Must return a non-empty string
          return typeof html === "string" && html.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("NotionTemplate renders non-empty HTML for any valid ResumeData", () => {
    fc.assert(
      fc.property(arbitraryResumeData(), (data) => {
        const html = renderToStaticMarkup(React.createElement(NotionTemplate, { data }));
        return typeof html === "string" && html.length > 0;
      }),
      { numRuns: 100 }
    );
  });

  test("AppleTemplate renders non-empty HTML for any valid ResumeData", () => {
    fc.assert(
      fc.property(arbitraryResumeData(), (data) => {
        const html = renderToStaticMarkup(React.createElement(AppleTemplate, { data }));
        return typeof html === "string" && html.length > 0;
      }),
      { numRuns: 100 }
    );
  });

  test("ATSFriendlyTemplate renders non-empty HTML for any valid ResumeData", () => {
    fc.assert(
      fc.property(arbitraryResumeData(), (data) => {
        const html = renderToStaticMarkup(React.createElement(ATSFriendlyTemplate, { data }));
        return typeof html === "string" && html.length > 0;
      }),
      { numRuns: 100 }
    );
  });

  test("rendered HTML contains the template class name", () => {
    fc.assert(
      fc.property(
        arbitraryResumeData(),
        fc.constantFrom(...TEMPLATE_NAMES),
        (data, templateName) => {
          const html = renderTemplate(templateName, data);
          const classMap: Record<TemplateName, string> = {
            "notion": "notion-template",
            "apple": "apple-template",
            "ats-friendly": "ats-friendly-template",
          };
          return html.includes(classMap[templateName]);
        }
      ),
      { numRuns: 100 }
    );
  });
});
