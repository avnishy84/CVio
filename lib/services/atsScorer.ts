/**
 * CVio — ATS Scorer Service
 * Pure deterministic function — no external I/O.
 * Computes an ATS score breakdown for a given ResumeData object.
 */

import type { ResumeData, ATSBreakdown, ATSResult } from "@/types/resume";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Tokenise text into lowercase words (letters/digits only). */
function tokenise(text: string): Set<string> {
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return new Set(words);
}

/** Collect all resume text into a single string for keyword matching. */
function resumeFullText(data: ResumeData): string {
  const parts: string[] = [];

  if (data.summary) parts.push(data.summary);
  parts.push(...data.skills);

  for (const exp of data.experience) {
    if (exp.company) parts.push(exp.company);
    if (exp.title) parts.push(exp.title);
    parts.push(...exp.bullets);
  }

  for (const edu of data.education) {
    if (edu.institution) parts.push(edu.institution);
    if (edu.degree) parts.push(edu.degree);
    if (edu.field) parts.push(edu.field);
  }

  for (const proj of data.projects) {
    if (proj.name) parts.push(proj.name);
    if (proj.description) parts.push(proj.description);
    parts.push(...proj.technologies);
  }

  const pi = data.personal_info;
  if (pi.name) parts.push(pi.name);
  if (pi.location) parts.push(pi.location);

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Scoring sub-functions (each returns a value within its stated max)
// ---------------------------------------------------------------------------

/** keywordMatch — max 30. Returns 0 when no jobDescription. */
function scoreKeywordMatch(data: ResumeData, jobDescription?: string): number {
  if (!jobDescription || jobDescription.trim() === "") return 0;

  const jdTokens = tokenise(jobDescription);
  if (jdTokens.size === 0) return 0;

  const resumeTokens = tokenise(resumeFullText(data));

  let matched = 0;
  Array.from(jdTokens).forEach((token) => {
    if (resumeTokens.has(token)) matched++;
  });

  const ratio = matched / jdTokens.size;
  return Math.round(ratio * 30);
}

/** formattingReadability — max 20. */
function scoreFormattingReadability(data: ResumeData): number {
  let score = 0;

  // Summary length: 50–300 chars is ideal (up to 8 pts)
  const summaryLen = data.summary?.trim().length ?? 0;
  if (summaryLen >= 50 && summaryLen <= 300) {
    score += 8;
  } else if (summaryLen > 0 && summaryLen < 50) {
    score += 3;
  } else if (summaryLen > 300) {
    score += 5; // too long but still present
  }

  // Skills count: ≥5 skills (up to 6 pts)
  const skillsCount = data.skills.length;
  if (skillsCount >= 10) {
    score += 6;
  } else if (skillsCount >= 5) {
    score += 4;
  } else if (skillsCount > 0) {
    score += 2;
  }

  // Experience bullets: ≥2 bullets per entry on average (up to 6 pts)
  if (data.experience.length > 0) {
    const totalBullets = data.experience.reduce(
      (sum, e) => sum + e.bullets.length,
      0
    );
    const avgBullets = totalBullets / data.experience.length;
    if (avgBullets >= 3) {
      score += 6;
    } else if (avgBullets >= 2) {
      score += 4;
    } else if (avgBullets >= 1) {
      score += 2;
    }
  }

  return Math.min(score, 20);
}

/** sectionCompleteness — max 15. 2.5 pts per section (6 sections). */
function scoreSectionCompleteness(data: ResumeData): number {
  const PTS = 2.5;
  let score = 0;

  // personal_info: at least name + email
  if (data.personal_info.name && data.personal_info.email) score += PTS;

  // summary
  if (data.summary && data.summary.trim().length > 0) score += PTS;

  // skills
  if (data.skills.length > 0) score += PTS;

  // experience
  if (data.experience.length > 0) score += PTS;

  // education
  if (data.education.length > 0) score += PTS;

  // projects
  if (data.projects.length > 0) score += PTS;

  return Math.min(score, 15);
}

/** impactMetrics — max 15. Checks for numbers/percentages/dollar amounts in bullets. */
function scoreImpactMetrics(data: ResumeData): number {
  if (data.experience.length === 0) return 0;

  const metricPattern = /(\d+%?|\$[\d,]+|[\d,]+\+?)/;

  let bulletsWithMetrics = 0;
  let totalBullets = 0;

  for (const exp of data.experience) {
    for (const bullet of exp.bullets) {
      totalBullets++;
      if (metricPattern.test(bullet)) bulletsWithMetrics++;
    }
  }

  if (totalBullets === 0) return 0;

  const ratio = bulletsWithMetrics / totalBullets;
  return Math.round(ratio * 15);
}

/** skillsRelevance — max 10. Based on skills array length and quality. */
function scoreSkillsRelevance(data: ResumeData): number {
  const count = data.skills.length;

  if (count >= 15) return 10;
  if (count >= 10) return 8;
  if (count >= 7) return 6;
  if (count >= 5) return 4;
  if (count >= 3) return 2;
  if (count >= 1) return 1;
  return 0;
}

/** experienceDepth — max 10. Based on number of entries and bullet depth. */
function scoreExperienceDepth(data: ResumeData): number {
  const entryCount = data.experience.length;
  if (entryCount === 0) return 0;

  // Entry count score (up to 5 pts)
  let entryScore = 0;
  if (entryCount >= 3) entryScore = 5;
  else if (entryCount === 2) entryScore = 3;
  else entryScore = 2;

  // Bullet depth score (up to 5 pts)
  const totalBullets = data.experience.reduce(
    (sum, e) => sum + e.bullets.length,
    0
  );
  const avgBullets = totalBullets / entryCount;
  let bulletScore = 0;
  if (avgBullets >= 4) bulletScore = 5;
  else if (avgBullets >= 3) bulletScore = 4;
  else if (avgBullets >= 2) bulletScore = 3;
  else if (avgBullets >= 1) bulletScore = 1;

  return Math.min(entryScore + bulletScore, 10);
}

// ---------------------------------------------------------------------------
// Suggestion generation
// ---------------------------------------------------------------------------

function generateSuggestions(
  data: ResumeData,
  breakdown: ATSBreakdown,
  keywordMatchingSkipped: boolean
): string[] {
  const suggestions: string[] = [];

  // Keyword match
  if (keywordMatchingSkipped) {
    suggestions.push(
      "Provide a job description to enable keyword matching and boost your ATS score."
    );
  } else if (breakdown.keywordMatch < 15) {
    suggestions.push(
      "Incorporate more keywords from the job description into your resume to improve keyword match."
    );
  }

  // Formatting / readability
  const summaryLen = data.summary?.trim().length ?? 0;
  if (summaryLen === 0) {
    suggestions.push(
      "Add a professional summary (50–300 characters) to improve readability and ATS parsing."
    );
  } else if (summaryLen < 50) {
    suggestions.push(
      "Expand your professional summary to at least 50 characters for better ATS readability."
    );
  }

  if (data.skills.length < 5) {
    suggestions.push(
      "List at least 5 relevant skills to strengthen your skills section."
    );
  }

  const avgBullets =
    data.experience.length > 0
      ? data.experience.reduce((s, e) => s + e.bullets.length, 0) /
        data.experience.length
      : 0;
  if (data.experience.length > 0 && avgBullets < 2) {
    suggestions.push(
      "Add at least 2 bullet points per experience entry to improve formatting readability."
    );
  }

  // Section completeness
  if (!data.personal_info.name || !data.personal_info.email) {
    suggestions.push(
      "Ensure your personal information section includes your full name and email address."
    );
  }
  if (!data.summary || data.summary.trim().length === 0) {
    // already added above if missing, avoid duplicate
  }
  if (data.skills.length === 0) {
    suggestions.push("Add a skills section to your resume.");
  }
  if (data.experience.length === 0) {
    suggestions.push(
      "Add at least one experience entry to demonstrate your work history."
    );
  }
  if (data.education.length === 0) {
    suggestions.push(
      "Include your educational background to complete your resume."
    );
  }
  if (data.projects.length === 0) {
    suggestions.push(
      "Add a projects section to showcase relevant work and side projects."
    );
  }

  // Impact metrics
  if (breakdown.impactMetrics < 8) {
    suggestions.push(
      "Quantify your achievements with numbers, percentages, or dollar amounts (e.g., 'Increased sales by 30%')."
    );
  }

  // Skills relevance
  if (breakdown.skillsRelevance < 5) {
    suggestions.push(
      "Expand your skills list to at least 10 relevant technical and soft skills."
    );
  }

  // Experience depth
  if (breakdown.experienceDepth < 5) {
    suggestions.push(
      "Add more experience entries or expand each entry with detailed bullet points."
    );
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const s of suggestions) {
    if (!seen.has(s)) {
      seen.add(s);
      unique.push(s);
    }
  }

  return unique;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Score a resume against ATS criteria.
 * Pure deterministic function — no external I/O.
 *
 * @param data          Structured resume data
 * @param jobDescription Optional job description for keyword matching
 * @returns ATSResult with score (0-100), breakdown, suggestions, keywordMatchingSkipped
 */
export function scoreResume(
  data: ResumeData,
  jobDescription?: string
): ATSResult {
  const keywordMatchingSkipped =
    !jobDescription || jobDescription.trim() === "";

  const breakdown: ATSBreakdown = {
    keywordMatch: keywordMatchingSkipped
      ? 0
      : scoreKeywordMatch(data, jobDescription),
    formattingReadability: scoreFormattingReadability(data),
    sectionCompleteness: scoreSectionCompleteness(data),
    impactMetrics: scoreImpactMetrics(data),
    skillsRelevance: scoreSkillsRelevance(data),
    experienceDepth: scoreExperienceDepth(data),
  };

  const score =
    breakdown.keywordMatch +
    breakdown.formattingReadability +
    breakdown.sectionCompleteness +
    breakdown.impactMetrics +
    breakdown.skillsRelevance +
    breakdown.experienceDepth;

  const suggestions = generateSuggestions(data, breakdown, keywordMatchingSkipped);

  // Requirements 4.4: ensure ≥3 suggestions whenever score < 80
  const FALLBACK_SUGGESTIONS = [
    "Review your resume against the job description to identify gaps.",
    "Use industry-specific keywords throughout your resume to improve ATS matching.",
    "Tailor your resume for each application to maximize your ATS score.",
  ];
  if (score < 80) {
    let i = 0;
    while (suggestions.length < 3 && i < FALLBACK_SUGGESTIONS.length) {
      const fb = FALLBACK_SUGGESTIONS[i++];
      if (!suggestions.includes(fb)) {
        suggestions.push(fb);
      }
    }
  }

  return {
    score,
    breakdown,
    suggestions,
    keywordMatchingSkipped,
  };
}
