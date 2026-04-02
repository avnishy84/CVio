/**
 * CVio — Shared TypeScript interfaces and types
 * Central type definitions used across all CVio domain services.
 */

// ---------------------------------------------------------------------------
// Core resume data structures
// ---------------------------------------------------------------------------

export interface PersonalInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  linkedin: string | null;
}

export interface ExperienceEntry {
  company: string | null;
  title: string | null;
  startDate: string | null; // ISO 8601 or "Present"
  endDate: string | null;
  location: string | null;
  bullets: string[];
}

export interface EducationEntry {
  institution: string | null;
  degree: string | null;
  field: string | null;
  startDate: string | null;
  endDate: string | null;
  gpa: string | null;
}

export interface ProjectEntry {
  name: string | null;
  description: string | null;
  technologies: string[];
  url: string | null;
}

export interface ResumeData {
  resumeId: string;
  userId: string | null;
  personal_info: PersonalInfo;
  summary: string | null;
  skills: string[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  education: EducationEntry[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export interface ParseResult {
  data: ResumeData;
  unextractedFields: (keyof ResumeData)[];
}

// ---------------------------------------------------------------------------
// AI Optimizer
// ---------------------------------------------------------------------------

export interface OptimizationResult {
  data: ResumeData;
  error?: string;
}

// ---------------------------------------------------------------------------
// ATS Scorer
// ---------------------------------------------------------------------------

export interface ATSBreakdown {
  keywordMatch: number;          // 0–30
  formattingReadability: number; // 0–20
  sectionCompleteness: number;   // 0–15
  impactMetrics: number;         // 0–15
  skillsRelevance: number;       // 0–10
  experienceDepth: number;       // 0–10
}

export interface ATSResult {
  score: number; // 0–100
  breakdown: ATSBreakdown;
  suggestions: string[];
  keywordMatchingSkipped: boolean;
}

// ---------------------------------------------------------------------------
// Role Optimizer — Requirements 5.1
// ---------------------------------------------------------------------------

export type SupportedRole =
  | "Software Developer"
  | "UI/UX Designer"
  | "Product Manager"
  | "HR"
  | "Marketing";

export const SUPPORTED_ROLES: SupportedRole[] = [
  "Software Developer",
  "UI/UX Designer",
  "Product Manager",
  "HR",
  "Marketing",
];

export interface RoleOptimizationResult {
  data: ResumeData;
  error?: string;
}

// ---------------------------------------------------------------------------
// Branding Analyzer
// ---------------------------------------------------------------------------

export interface BrandingResult {
  summaryScore: number; // 1–10
  tone: "formal" | "technical" | "creative" | "neutral";
  hasUniqueValueProposition: boolean;
  uvpSuggestion?: string;
  headlines: string[];       // at least 1
  taglines: string[];        // at least 1
  careerNarratives: string[]; // at least 1
}

// ---------------------------------------------------------------------------
// LinkedIn Comparator
// ---------------------------------------------------------------------------

export interface LinkedInSource {
  type: "url" | "pdf";
  value: string | Buffer;
}

export interface Inconsistency {
  field: string;
  resumeValue: string;
  linkedInValue: string;
  priority: "high" | "medium" | "low";
}

export interface ComparisonResult {
  inconsistencies: Inconsistency[];
  resumeSuggestions: string[];
  linkedInSuggestions: string[];
}

// ---------------------------------------------------------------------------
// Version Store
// ---------------------------------------------------------------------------

export interface ResumeVersion {
  versionId: string;
  resumeId: string;
  userId: string;
  data: ResumeData;
  timestamp: Date;
  versionNumber: number;
}

// ---------------------------------------------------------------------------
// Exporter
// ---------------------------------------------------------------------------

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}
