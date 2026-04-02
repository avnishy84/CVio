/**
 * CVio — Parser Service
 * Extracts structured ResumeData from uploaded PDF or DOCX files using
 * pdf-parse / mammoth for raw text extraction, then GPT-4o for structured parsing.
 */

import crypto from "crypto";
import OpenAI from "openai";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import type {
  ResumeData,
  ParseResult,
  PersonalInfo,
  ExperienceEntry,
  EducationEntry,
  ProjectEntry,
} from "../../types/resume";

// ---------------------------------------------------------------------------
// OpenAI client
// ---------------------------------------------------------------------------

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------------------------------------------------------------------------
// Extraction prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a resume parser. Extract structured data from the following resume text.
Return ONLY valid JSON matching this schema: { personal_info, summary, skills, experience, projects, education }.
Use null for any field you cannot find. Do not invent data.`;

// ---------------------------------------------------------------------------
// Types for the raw GPT-4o response
// ---------------------------------------------------------------------------

interface RawResumeExtraction {
  personal_info?: Partial<PersonalInfo> | null;
  summary?: string | null;
  skills?: string[] | null;
  experience?: Partial<ExperienceEntry>[] | null;
  projects?: Partial<ProjectEntry>[] | null;
  education?: Partial<EducationEntry>[] | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalisePersonalInfo(raw: Partial<PersonalInfo> | null | undefined): PersonalInfo {
  return {
    name: raw?.name ?? null,
    email: raw?.email ?? null,
    phone: raw?.phone ?? null,
    location: raw?.location ?? null,
    website: raw?.website ?? null,
    linkedin: raw?.linkedin ?? null,
  };
}

function normaliseExperience(raw: Partial<ExperienceEntry>[] | null | undefined): ExperienceEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((e) => ({
    company: e.company ?? null,
    title: e.title ?? null,
    startDate: e.startDate ?? null,
    endDate: e.endDate ?? null,
    location: e.location ?? null,
    bullets: Array.isArray(e.bullets) ? e.bullets : [],
  }));
}

function normaliseEducation(raw: Partial<EducationEntry>[] | null | undefined): EducationEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((e) => ({
    institution: e.institution ?? null,
    degree: e.degree ?? null,
    field: e.field ?? null,
    startDate: e.startDate ?? null,
    endDate: e.endDate ?? null,
    gpa: e.gpa ?? null,
  }));
}

function normaliseProjects(raw: Partial<ProjectEntry>[] | null | undefined): ProjectEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => ({
    name: p.name ?? null,
    description: p.description ?? null,
    technologies: Array.isArray(p.technologies) ? p.technologies : [],
    url: p.url ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Core extraction via GPT-4o
// ---------------------------------------------------------------------------

async function extractWithGPT(rawText: string): Promise<ResumeData> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: rawText },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  const parsed: RawResumeExtraction = JSON.parse(content);

  const now = new Date().toISOString();

  return {
    resumeId: crypto.randomUUID(),
    userId: null,
    personal_info: normalisePersonalInfo(parsed.personal_info),
    summary: parsed.summary ?? null,
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    experience: normaliseExperience(parsed.experience),
    projects: normaliseProjects(parsed.projects),
    education: normaliseEducation(parsed.education),
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Determine unextracted fields
// ---------------------------------------------------------------------------

const EXTRACTABLE_FIELDS: (keyof ResumeData)[] = [
  "personal_info",
  "summary",
  "skills",
  "experience",
  "projects",
  "education",
];

function computeUnextractedFields(data: ResumeData): (keyof ResumeData)[] {
  const missing: (keyof ResumeData)[] = [];

  for (const field of EXTRACTABLE_FIELDS) {
    const value = data[field];
    if (value === null) {
      missing.push(field);
    } else if (Array.isArray(value) && value.length === 0) {
      // Empty arrays are treated as unextracted for list fields
      missing.push(field);
    } else if (
      field === "personal_info" &&
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      // personal_info is unextracted only when every sub-field is null
      const info = value as PersonalInfo;
      const allNull = Object.values(info).every((v) => v === null);
      if (allNull) missing.push(field);
    }
  }

  return missing;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a resume buffer (PDF or DOCX) and return structured ResumeData.
 * Fields that could not be extracted are set to null / [] and listed in
 * `unextractedFields`.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
export async function parseResume(
  buffer: Buffer,
  mimeType:
    | "application/pdf"
    | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
): Promise<ParseResult> {
  let rawText: string;

  if (mimeType === "application/pdf") {
    // Requirement 2.1 — PDF path uses pdf-parse v1
    const result = await pdfParse(buffer);
    rawText = result.text;
  } else {
    // Requirement 2.2 — DOCX path uses mammoth
    const result = await mammoth.extractRawText({ buffer });
    rawText = result.value;
  }

  const data = await extractWithGPT(rawText);
  const unextractedFields = computeUnextractedFields(data);

  return { data, unextractedFields };
}
