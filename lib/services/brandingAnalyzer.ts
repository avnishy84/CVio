/**
 * CVio — Branding Analyzer Service
 * Evaluates professional summary, tone, and unique value proposition using GPT-4o.
 * Validates and clamps all response fields to ensure schema invariants hold.
 * On OpenAI error, returns a safe default BrandingResult.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import OpenAI from "openai";
import type { ResumeData, BrandingResult } from "../../types/resume";

// ---------------------------------------------------------------------------
// OpenAI client — lazy-initialized to avoid module-load failures in test
// environments where OPENAI_API_KEY is not set
// ---------------------------------------------------------------------------

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_TONES = ["formal", "technical", "creative", "neutral"] as const;
type Tone = (typeof VALID_TONES)[number];

const DEFAULT_BRANDING_RESULT: BrandingResult = {
  summaryScore: 1,
  tone: "neutral",
  hasUniqueValueProposition: false,
  uvpSuggestion:
    "Consider adding a unique value proposition that highlights what sets you apart from other candidates.",
  headlines: ["Experienced Professional Seeking New Opportunities"],
  taglines: ["Bringing expertise and dedication to every role."],
  careerNarratives: [
    "A results-driven professional with a track record of delivering impactful work.",
  ],
};

// ---------------------------------------------------------------------------
// Branding prompt (Requirement 6.1, 6.2, 6.3, 6.4)
// ---------------------------------------------------------------------------

const BRANDING_SYSTEM_PROMPT = `Analyze this resume for personal branding quality.
Return JSON: { summaryScore (1-10), tone, hasUniqueValueProposition, uvpSuggestion, headlines[], taglines[], careerNarratives[] }
- summaryScore: integer from 1 to 10 rating the professional summary quality
- tone: one of "formal", "technical", "creative", or "neutral"
- hasUniqueValueProposition: boolean indicating whether the summary contains a unique value proposition
- uvpSuggestion: string suggestion for improving the UVP (include even if hasUniqueValueProposition is true)
- headlines: array of at least 1 strong professional headline suggestion
- taglines: array of at least 1 personal tagline suggestion
- careerNarratives: array of at least 1 career narrative framing suggestion
Return ONLY valid JSON.`;

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Clamp a number to [min, max] and round to nearest integer.
 */
function clampInt(value: unknown, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * Ensure a value is one of the valid tone strings; fall back to "neutral".
 */
function validateTone(value: unknown): Tone {
  if (typeof value === "string" && (VALID_TONES as readonly string[]).includes(value)) {
    return value as Tone;
  }
  return "neutral";
}

/**
 * Ensure a value is a non-empty string array; provide a fallback element if empty.
 */
function validateStringArray(value: unknown, fallback: string): string[] {
  if (!Array.isArray(value)) return [fallback];
  const filtered = value.filter((v): v is string => typeof v === "string" && v.length > 0);
  return filtered.length > 0 ? filtered : [fallback];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyze a resume for personal branding quality using GPT-4o.
 *
 * Validates and clamps all fields in the GPT response:
 * - summaryScore clamped to [1, 10]
 * - tone restricted to valid enum values
 * - headlines, taglines, careerNarratives guaranteed to have at least 1 element
 *
 * On OpenAI error, returns DEFAULT_BRANDING_RESULT.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
export async function analyzeBranding(data: ResumeData): Promise<BrandingResult> {
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: BRANDING_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(data) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed: Record<string, any> = JSON.parse(raw);

    // Validate and clamp each field to enforce schema invariants (Property 13)
    const summaryScore = clampInt(parsed.summaryScore, 1, 10);
    const tone = validateTone(parsed.tone);
    const hasUniqueValueProposition =
      typeof parsed.hasUniqueValueProposition === "boolean"
        ? parsed.hasUniqueValueProposition
        : false;
    const uvpSuggestion =
      typeof parsed.uvpSuggestion === "string" ? parsed.uvpSuggestion : undefined;
    const headlines = validateStringArray(
      parsed.headlines,
      "Experienced Professional Seeking New Opportunities"
    );
    const taglines = validateStringArray(
      parsed.taglines,
      "Bringing expertise and dedication to every role."
    );
    const careerNarratives = validateStringArray(
      parsed.careerNarratives,
      "A results-driven professional with a track record of delivering impactful work."
    );

    return {
      summaryScore,
      tone,
      hasUniqueValueProposition,
      ...(uvpSuggestion !== undefined && { uvpSuggestion }),
      headlines,
      taglines,
      careerNarratives,
    };
  } catch {
    // Requirement 6.1–6.4: on any error, return a safe default result
    return { ...DEFAULT_BRANDING_RESULT };
  }
}
