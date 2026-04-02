/**
 * CVio — LinkedIn Comparator Service
 * Compares resume data against a LinkedIn profile (URL or PDF export) and
 * surfaces inconsistencies in job titles, dates, skills, and education.
 * Supports selective import of LinkedIn fields into the current ResumeData.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import https from "https";
import http from "http";
import pdfParse from "pdf-parse";
import OpenAI from "openai";
import type {
  ResumeData,
  LinkedInSource,
  ComparisonResult,
  Inconsistency,
} from "../../types/resume";

// ---------------------------------------------------------------------------
// OpenAI client — lazy-initialized to avoid failures in test environments
// ---------------------------------------------------------------------------

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// ---------------------------------------------------------------------------
// Error result helper — returns empty ComparisonResult with an error property
// ---------------------------------------------------------------------------

interface ComparisonResultWithError extends ComparisonResult {
  error?: string;
}

function errorResult(message: string): ComparisonResultWithError {
  return {
    inconsistencies: [],
    resumeSuggestions: [],
    linkedInSuggestions: [],
    error: message,
  };
}

// ---------------------------------------------------------------------------
// URL fetching — uses built-in https/http modules (no extra dependencies)
// ---------------------------------------------------------------------------

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https://") ? https : http;
    const req = protocol.get(url, (res) => {
      // Follow a single redirect
      if (
        res.statusCode &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`HTTP ${res.statusCode ?? "unknown"} fetching LinkedIn URL`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(10_000, () => {
      req.destroy(new Error("Request timed out fetching LinkedIn URL"));
    });
  });
}

// ---------------------------------------------------------------------------
// GPT-4o helpers
// ---------------------------------------------------------------------------

const EXTRACTION_SYSTEM_PROMPT = `You are a LinkedIn profile parser. Extract structured resume data from the following LinkedIn profile text.
Return ONLY valid JSON matching this schema: { personal_info, summary, skills, experience, projects, education }.
Use null for any field you cannot find. Do not invent data.`;

const COMPARISON_SYSTEM_PROMPT = `You are a resume consistency checker. Compare the resume data and LinkedIn data provided.
Identify inconsistencies in job titles, dates, skills, and education.
Return ONLY valid JSON: { inconsistencies: [{ field, resumeValue, linkedInValue, priority }], resumeSuggestions: string[], linkedInSuggestions: string[] }
- field: the name of the differing field (e.g. "experience[0].title", "skills", "education[0].degree")
- resumeValue: the value from the resume (as a string)
- linkedInValue: the value from LinkedIn (as a string)
- priority: "high" | "medium" | "low"
- resumeSuggestions: list of suggested corrections for the resume
- linkedInSuggestions: list of suggested corrections for the LinkedIn profile`;

async function extractLinkedInData(text: string): Promise<Partial<ResumeData>> {
  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as Partial<ResumeData>;
}

async function compareData(
  resumeData: ResumeData,
  linkedInData: Partial<ResumeData>
): Promise<{ inconsistencies: Inconsistency[]; resumeSuggestions: string[]; linkedInSuggestions: string[] }> {
  const payload = { resume: resumeData, linkedIn: linkedInData };
  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: COMPARISON_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(payload) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed: any = JSON.parse(raw);
  return {
    inconsistencies: Array.isArray(parsed.inconsistencies) ? parsed.inconsistencies : [],
    resumeSuggestions: Array.isArray(parsed.resumeSuggestions) ? parsed.resumeSuggestions : [],
    linkedInSuggestions: Array.isArray(parsed.linkedInSuggestions) ? parsed.linkedInSuggestions : [],
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compare resume data against a LinkedIn profile (URL or PDF export).
 *
 * - If source.type === "url": fetches the URL text, extracts LinkedIn data via GPT-4o
 * - If source.type === "pdf": parses the PDF buffer, extracts LinkedIn data via GPT-4o
 * - On any error (inaccessible URL, unparseable PDF, network error): returns an
 *   error result with empty arrays; the original ResumeData is never mutated.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.5
 */
export async function compareWithLinkedIn(
  data: ResumeData,
  source: LinkedInSource
): Promise<ComparisonResultWithError> {
  try {
    let text: string;

    if (source.type === "url") {
      // Requirement 7.1 — accept URL input
      if (typeof source.value !== "string" || !source.value) {
        return errorResult("LinkedIn URL must be a non-empty string");
      }
      text = await fetchUrl(source.value);
    } else {
      // Requirement 7.1 — accept PDF buffer input
      const buffer =
        source.value instanceof Buffer
          ? source.value
          : Buffer.from(source.value as string, "binary");
      const parsed = await pdfParse(buffer);
      text = parsed.text;
      if (!text || text.trim().length === 0) {
        return errorResult("LinkedIn PDF could not be parsed: no text content found");
      }
    }

    // Extract structured LinkedIn data from the raw text
    const linkedInData = await extractLinkedInData(text);

    // Compare and generate suggestions
    const comparison = await compareData(data, linkedInData);

    return comparison;
  } catch (err) {
    // Requirement 7.5 — on any error, return error result; original data unchanged
    const message = err instanceof Error ? err.message : String(err);
    return errorResult(message || "LinkedIn comparison failed");
  }
}

/**
 * Import selected fields from LinkedIn data into the current ResumeData.
 * Pure function — does not mutate the original data.
 *
 * For each field in selectedFields, overwrites data[field] with linkedInData[field].
 * All other fields remain unchanged.
 *
 * Requirement: 7.4
 */
export function importLinkedInFields(
  data: ResumeData,
  linkedInData: Partial<ResumeData>,
  selectedFields: (keyof ResumeData)[]
): ResumeData {
  // Start with a shallow copy of the original
  const result: ResumeData = { ...data };

  for (const field of selectedFields) {
    if (field in linkedInData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[field] = (linkedInData as any)[field];
    }
  }

  return result;
}
