/**
 * CVio — Role Optimizer Service
 * Tailors resume content to a specific target role using GPT-4o with
 * role-specific keyword, tone, and structure conventions.
 * On OpenAI error, returns the original data unchanged with a non-empty error string.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import OpenAI from "openai";
import type { ResumeData, RoleOptimizationResult, SupportedRole } from "../../types/resume";
import { SUPPORTED_ROLES } from "../../types/resume";

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
// Role conventions config — Requirement 5.2
// ---------------------------------------------------------------------------

interface RoleConventions {
  keywords: string[];
  tone: string;
  sectionOrder: string[];
}

const ROLE_CONVENTIONS: Record<SupportedRole, RoleConventions> = {
  "Software Developer": {
    keywords: [
      "algorithms", "APIs", "architecture", "CI/CD", "cloud", "code review",
      "debugging", "deployment", "distributed systems", "Docker", "Git",
      "infrastructure", "Kubernetes", "microservices", "performance", "REST",
      "scalability", "system design", "testing", "TypeScript",
    ],
    tone: "technical and precise — use engineering terminology, quantify performance improvements, highlight system scale and complexity",
    sectionOrder: ["summary", "skills", "experience", "projects", "education"],
  },
  "UI/UX Designer": {
    keywords: [
      "accessibility", "A/B testing", "design systems", "Figma", "information architecture",
      "interaction design", "prototyping", "responsive design", "usability testing",
      "user flows", "user research", "visual hierarchy", "wireframing", "WCAG",
      "component library", "design tokens", "motion design", "cross-functional",
    ],
    tone: "creative and user-centric — emphasize empathy, design thinking, and measurable UX outcomes such as task completion rates and satisfaction scores",
    sectionOrder: ["summary", "skills", "experience", "projects", "education"],
  },
  "Product Manager": {
    keywords: [
      "agile", "backlog", "cross-functional", "customer discovery", "data-driven",
      "go-to-market", "KPIs", "metrics", "OKRs", "prioritization", "product roadmap",
      "product strategy", "revenue growth", "scrum", "stakeholder management",
      "user stories", "market research", "competitive analysis", "launch",
    ],
    tone: "strategic and outcome-oriented — lead with business impact, revenue figures, and user growth metrics; demonstrate leadership across engineering, design, and business teams",
    sectionOrder: ["summary", "experience", "skills", "education", "projects"],
  },
  "HR": {
    keywords: [
      "benefits administration", "compliance", "DEI", "employee engagement",
      "employee relations", "HRIS", "HR policies", "labor law", "onboarding",
      "organizational development", "performance management", "recruiting",
      "retention", "talent acquisition", "talent development", "training",
      "workforce planning", "compensation", "culture",
    ],
    tone: "people-focused and professional — highlight interpersonal skills, policy expertise, and measurable improvements in retention, engagement, or hiring efficiency",
    sectionOrder: ["summary", "experience", "skills", "education", "projects"],
  },
  "Marketing": {
    keywords: [
      "brand awareness", "campaign management", "content strategy", "conversion rate",
      "CRM", "digital marketing", "email marketing", "engagement", "funnel optimization",
      "growth hacking", "lead generation", "market segmentation", "paid media",
      "ROI", "SEO/SEM", "social media", "storytelling", "analytics", "A/B testing",
    ],
    tone: "persuasive and results-driven — quantify campaign performance with CTR, conversion rates, and revenue attribution; showcase creative thinking alongside analytical rigor",
    sectionOrder: ["summary", "experience", "skills", "projects", "education"],
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Type guard — returns true if and only if the given string is one of the
 * five supported roles.
 *
 * Requirements: 5.1, 5.4
 */
export function validateRole(role: string): role is SupportedRole {
  return (SUPPORTED_ROLES as string[]).includes(role);
}

/**
 * Optimize a resume for a specific target role using GPT-4o.
 * Returns the role-tailored ResumeData, or the original data plus an error
 * string if the OpenAI call fails.
 *
 * Requirements: 5.2, 5.3
 */
export async function optimizeForRole(
  data: ResumeData,
  role: SupportedRole
): Promise<RoleOptimizationResult> {
  const conventions = ROLE_CONVENTIONS[role];

  const roleConventionsText = [
    `Keywords to emphasize: ${conventions.keywords.join(", ")}.`,
    `Tone: ${conventions.tone}.`,
    `Preferred section order: ${conventions.sectionOrder.join(" → ")}.`,
  ].join(" ");

  const systemPrompt =
    `You are a resume specialist for ${role} positions. ` +
    `Adjust the resume to emphasize keywords, skills ordering, structure, and tone ` +
    `appropriate for ${role} roles. Follow these conventions: ${roleConventionsText} ` +
    `Return ONLY valid JSON with the same schema as the input.`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
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
    return { data, error: message || "OpenAI role optimization failed" };
  }
}
