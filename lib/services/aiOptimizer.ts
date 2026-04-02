/**
 * CVio — AI Optimizer Service
 * Rewrites resume content using GPT-4o with an anti-hallucination system prompt.
 * On OpenAI error, returns the original data unchanged with a non-empty error string.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import OpenAI from "openai";
import type { ResumeData, OptimizationResult } from "../../types/resume";

// ---------------------------------------------------------------------------
// OpenAI client
// ---------------------------------------------------------------------------

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------------------------------------------------------------------------
// System prompt — anti-hallucination (Requirement 3.4)
// ---------------------------------------------------------------------------

const OPTIMIZATION_SYSTEM_PROMPT = `You are an expert resume writer. Rewrite the provided resume data to:
1. Use strong action verbs (led, built, reduced, increased, etc.)
2. Improve grammar and clarity
3. Add quantified metrics where achievements lack measurable outcomes
CRITICAL: Do NOT change employer names, job titles, dates, or educational credentials.
Return ONLY valid JSON with the same schema as the input.`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Optimize an entire resume using GPT-4o.
 * Returns the rewritten ResumeData, or the original data plus an error string
 * if the OpenAI call fails.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
export async function optimizeResume(data: ResumeData): Promise<OptimizationResult> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: OPTIMIZATION_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(data) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const optimized: ResumeData = JSON.parse(content);

    return { data: optimized };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { data, error: message || "OpenAI optimization failed" };
  }
}

/**
 * Optimize a single section of the resume.
 * Sends only the section content to GPT-4o and returns the rewritten value.
 * Falls back to the original content on error.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export async function optimizeSection(
  section: keyof ResumeData,
  content: unknown
): Promise<unknown> {
  const sectionPrompt = `${OPTIMIZATION_SYSTEM_PROMPT}

You are rewriting only the "${section}" section. Return ONLY valid JSON for that section value.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: sectionPrompt },
        { role: "user", content: JSON.stringify(content) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    // GPT returns a JSON object wrapper; unwrap if the section value is nested
    const parsed: unknown = JSON.parse(raw);

    // If the model wrapped the value in an object keyed by section name, unwrap it
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      section in (parsed as Record<string, unknown>)
    ) {
      return (parsed as Record<string, unknown>)[section];
    }

    return parsed;
  } catch {
    // Requirement 3.5 — return original content on error
    return content;
  }
}
