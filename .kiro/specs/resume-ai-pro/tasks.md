# Implementation Plan: ResumeAI Pro

## Overview

Incremental build of the ResumeAI Pro Next.js 14 SaaS application. Each task produces working, integrated code. Services are built as pure TypeScript modules first, then wired to API routes, then connected to the UI.

## Tasks

- [x] 1. Project scaffolding and configuration
  - Bootstrap Next.js 14 App Router project with TypeScript and Tailwind CSS
  - Install all dependencies: `pdf-parse`, `mammoth`, `openai`, `firebase`, `firebase-admin`, `puppeteer`, `docx`, `multer`, `fast-check`, `jest`, `ts-jest`, `framer-motion`
  - Create `lib/firebase.ts` (client SDK init) and `lib/firebaseAdmin.ts` (Admin SDK init) using environment variables
  - Create `jest.config.ts` and `tsconfig.json` with path aliases
  - Create `.env.local.example` listing all required env vars (`OPENAI_API_KEY`, `FIREBASE_*`, etc.)
  - _Requirements: 10.1_

- [x] 2. Core data types
  - [x] 2.1 Create `types/resume.ts` with all shared interfaces
    - Define `PersonalInfo`, `ExperienceEntry`, `EducationEntry`, `ProjectEntry`, `ResumeData`
    - Define `ParseResult`, `OptimizationResult`, `ATSBreakdown`, `ATSResult`, `RoleOptimizationResult`, `BrandingResult`, `Inconsistency`, `ComparisonResult`, `ResumeVersion`, `ExportResult`
    - Define `SupportedRole` union type and `SUPPORTED_ROLES` constant array
    - _Requirements: 2.3, 4.2, 5.1_

- [x] 3. Parser service
  - [x] 3.1 Implement `lib/services/parser.ts`
    - Implement `parseResume(buffer, mimeType)` routing to pdf-parse or mammoth
    - Implement GPT-4o extraction prompt call to produce structured `ResumeData`
    - Return partial `ResumeData` with `null` fields and populate `unextractedFields`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 Write property test for Parser output schema completeness
    - **Property 3: Parser output schema completeness**
    - **Validates: Requirements 2.3**

  - [x] 3.3 Write property test for Parser partial extraction reporting
    - **Property 4: Parser partial extraction reporting**
    - **Validates: Requirements 2.4**

  - [x] 3.4 Write unit tests for Parser
    - Test PDF path with a known fixture buffer
    - Test DOCX path with a known fixture buffer
    - _Requirements: 2.1, 2.2_

- [x] 4. ATS Scorer service
  - [x] 4.1 Implement `lib/services/atsScorer.ts`
    - Implement `scoreResume(data, jobDescription?)` as a pure deterministic function
    - Compute weighted breakdown: keyword (30), formatting (20), completeness (15), impact (15), skills (10), experience (10)
    - Return `ATSResult` with `score`, `breakdown`, `suggestions`, `keywordMatchingSkipped`
    - Return ≥3 suggestions when score < 80; set `keywordMatch=0` and `keywordMatchingSkipped=true` when no job description
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 4.2 Write property test for ATS score weighted sum invariant
    - **Property 8: ATS score weighted sum invariant**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 4.3 Write property test for ATS low-score suggestions
    - **Property 9: ATS low-score suggestions**
    - **Validates: Requirements 4.4**

  - [x] 4.4 Write property test for ATS no-job-description behavior
    - **Property 10: ATS no-job-description behavior**
    - **Validates: Requirements 4.5**

  - [x] 4.5 Write property test for ATS scorer determinism
    - **Property 11: ATS scorer determinism**
    - **Validates: Requirements 4.6**

- [x] 5. AI Optimizer service
  - [x] 5.1 Implement `lib/services/aiOptimizer.ts`
    - Implement `optimizeResume(data)` with anti-hallucination system prompt
    - Implement `optimizeSection(section, content)` for single-section regeneration
    - On OpenAI error return original `data` unchanged plus non-empty `error` string
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 5.2 Write property test for AI Optimizer preserves factual fields
    - **Property 6: AI Optimizer preserves factual fields**
    - **Validates: Requirements 3.4**

  - [x] 5.3 Write property test for AI Optimizer error fallback
    - **Property 7: AI Optimizer error fallback**
    - **Validates: Requirements 3.5**

- [x] 6. Role Optimizer service
  - [x] 6.1 Implement `lib/services/roleOptimizer.ts`
    - Implement `validateRole(role)` type guard against `SUPPORTED_ROLES`
    - Implement `optimizeForRole(data, role)` calling AI_Optimizer with role-specific system prompt
    - Create static role conventions config (keyword lists, tone, section ordering) for all 5 roles
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 6.2 Write property test for role validation accept/reject
    - **Property 12: Role validation — accept/reject**
    - **Validates: Requirements 5.1, 5.4**

- [x] 7. Branding Analyzer service
  - [x] 7.1 Implement `lib/services/brandingAnalyzer.ts`
    - Implement `analyzeBranding(data)` with GPT-4o branding prompt
    - Validate response: `summaryScore` ∈ [1,10], `tone` ∈ enum, arrays non-empty
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 7.2 Write property test for Branding result schema invariant
    - **Property 13: Branding result schema invariant**
    - **Validates: Requirements 6.1, 6.2, 6.4**

- [x] 8. LinkedIn Comparator service
  - [x] 8.1 Implement `lib/services/linkedInComparator.ts`
    - Implement `compareWithLinkedIn(data, source)` accepting URL or PDF buffer
    - Implement `importLinkedInFields(data, linkedInData, selectedFields)` as a pure function
    - Return error and preserve original `ResumeData` on inaccessible URL or unparseable PDF
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 8.2 Write property test for LinkedIn comparison detects known differences
    - **Property 14: LinkedIn comparison detects known differences**
    - **Validates: Requirements 7.2**

  - [x] 8.3 Write property test for LinkedIn selective import
    - **Property 15: LinkedIn selective import**
    - **Validates: Requirements 7.4**

  - [x] 8.4 Write property test for LinkedIn error preserves data
    - **Property 16: LinkedIn error preserves data**
    - **Validates: Requirements 7.5**

  - [x] 8.5 Write unit tests for LinkedIn Comparator
    - Test URL input type accepted
    - Test PDF input type accepted
    - _Requirements: 7.1_

- [x] 9. Auth Service and middleware
  - [x] 9.1 Implement `lib/services/authService.ts`
    - Implement `verifyIdToken(idToken)` wrapping Firebase Admin `auth().verifyIdToken()`
    - Implement `withAuth(handler)` middleware extracting Bearer token and attaching decoded user to request
    - Return 401 `{ error: "Unauthorized" }` on missing or invalid token
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 9.2 Write property test for invalid credentials do not establish sessions
    - **Property 21: Invalid credentials do not establish sessions**
    - **Validates: Requirements 10.3**

  - [x] 9.3 Write property test for user data isolation
    - **Property 22: User data isolation**
    - **Validates: Requirements 10.4**

- [x] 10. Version Store service
  - [x] 10.1 Implement `lib/services/versionStore.ts`
    - Implement `saveVersion`, `listVersions`, `getVersion`, `deleteResume` using Firestore sub-collection schema
    - Auto-increment `versionNumber` on each save; retain all versions (no cap below 10)
    - `listVersions` returns versions ordered by `timestamp` descending
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 10.2 Write property test for version number monotonicity
    - **Property 23: Version number monotonicity**
    - **Validates: Requirements 11.1**

  - [x] 10.3 Write property test for resume list ordering
    - **Property 24: Resume list ordering**
    - **Validates: Requirements 11.2**

  - [x] 10.4 Write property test for version load round trip
    - **Property 25: Version load round trip**
    - **Validates: Requirements 11.3**

  - [x] 10.5 Write property test for version retention minimum
    - **Property 26: Version retention minimum**
    - **Validates: Requirements 11.4**

  - [x] 10.6 Write property test for deletion removes all versions
    - **Property 27: Deletion removes all versions**
    - **Validates: Requirements 11.5**

- [x] 11. Checkpoint — core services complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Exporter service
  - [x] 12.1 Implement `lib/services/exporter.ts`
    - Implement `exportToPDF(data, template)`: render template to HTML string → Puppeteer `setContent` → `pdf()`
    - Implement `exportToDOCX(data)`: map each `ResumeData` section to `docx` `Paragraph`/`TextRun` objects
    - Both functions return `ExportResult { buffer, filename, mimeType }`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 12.2 Write property test for export–parse round trip
    - **Property 5: Export–parse round trip**
    - **Validates: Requirements 2.6, 9.5**

  - [x] 12.3 Write unit tests for Exporter
    - Verify PDF buffer is non-empty for a known `ResumeData` fixture
    - Verify DOCX buffer is non-empty for a known `ResumeData` fixture
    - _Requirements: 9.1, 9.2_

- [x] 13. API routes — upload and optimize
  - [x] 13.1 Create `app/api/upload/route.ts`
    - Parse multipart form data with multer; enforce 10 MB limit and PDF/DOCX MIME check
    - Call `parseResume` and return `ParseResult`; return 413/415 on validation failure
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 13.2 Write property test for file format validation
    - **Property 1: File format validation**
    - **Validates: Requirements 1.1, 1.3**

  - [x] 13.3 Write property test for file size rejection
    - **Property 2: File size rejection**
    - **Validates: Requirements 1.2**

  - [x] 13.4 Create `app/api/optimize/route.ts` and `app/api/optimize/section/route.ts`
    - Wrap with `withAuth`; call `optimizeResume` or `optimizeSection`; return result
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 14. API routes — analysis and role
  - [x] 14.1 Create `app/api/ats-score/route.ts`
    - Wrap with `withAuth`; call `scoreResume(data, jobDescription?)`; return `ATSResult`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 14.2 Create `app/api/role-optimize/route.ts`
    - Wrap with `withAuth`; call `validateRole` → 400 on failure; call `optimizeForRole`; return result
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 14.3 Create `app/api/branding/route.ts`
    - Wrap with `withAuth`; call `analyzeBranding`; return `BrandingResult`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 15. API routes — LinkedIn, export, resumes
  - [x] 15.1 Create `app/api/linkedin/compare/route.ts` and `app/api/linkedin/import/route.ts`
    - Wrap with `withAuth`; call `compareWithLinkedIn` / `importLinkedInFields`; handle 422 on source failure
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 15.2 Create `app/api/export/pdf/route.ts` and `app/api/export/docx/route.ts`
    - Wrap with `withAuth`; call `exportToPDF` / `exportToDOCX`; stream buffer with `Content-Disposition: attachment`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 15.3 Create `app/api/resumes/route.ts` (GET list, POST save) and `app/api/resumes/[resumeId]/route.ts` (DELETE)
    - Wrap with `withAuth`; call `listVersions` / `saveVersion` / `deleteResume`
    - _Requirements: 11.1, 11.2, 11.5_

  - [x] 15.4 Create `app/api/resumes/[resumeId]/versions/route.ts` and `app/api/resumes/[resumeId]/versions/[versionId]/route.ts`
    - Wrap with `withAuth`; call `listVersions` / `getVersion`
    - _Requirements: 11.2, 11.3, 11.4_

- [x] 16. Checkpoint — all API routes wired
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Auth UI pages and guard
  - [x] 17.1 Create `components/auth/AuthGuard.tsx`
    - Check Firebase Auth `onAuthStateChanged`; redirect unauthenticated users to `/login`
    - _Requirements: 10.1, 10.4_

  - [x] 17.2 Create `app/(auth)/login/page.tsx` and `app/(auth)/register/page.tsx`
    - Email/password form using Firebase client SDK `signInWithEmailAndPassword` / `createUserWithEmailAndPassword`
    - Show error message on invalid credentials; redirect to dashboard on success
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 17.3 Create `app/layout.tsx` with `AuthContext` provider and `ThemeProvider`
    - Expose `currentUser` and `idToken` via context for use in API calls
    - _Requirements: 10.1_

- [x] 18. Upload DropZone component
  - [x] 18.1 Create `components/upload/DropZone.tsx`
    - Drag-and-drop and click-to-browse file input; enforce PDF/DOCX and 10 MB client-side
    - On valid file, POST to `/api/upload` with `multipart/form-data`; surface `ParseResult` to parent via callback
    - Glassmorphism styling with Tailwind
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 19. Resume Builder UI
  - [x] 19.1 Create three template components
    - `components/builder/templates/NotionTemplate.tsx`
    - `components/builder/templates/AppleTemplate.tsx`
    - `components/builder/templates/ATSFriendlyTemplate.tsx`
    - Each accepts `ResumeData` and renders all sections; must return non-empty output for any valid input
    - _Requirements: 8.1_

  - [x] 19.2 Write property test for template rendering succeeds for all valid inputs
    - **Property 17: Template rendering succeeds for all valid inputs**
    - **Validates: Requirements 8.1**

  - [x] 19.3 Create `components/builder/SectionEditor.tsx`
    - Inline-editable wrapper; dispatches field-update actions to parent reducer
    - _Requirements: 8.2_

  - [x] 19.4 Create `components/builder/TemplateSelector.tsx`
    - Renders three template option buttons; calls `onSelect` without mutating `ResumeData`
    - _Requirements: 8.4_

  - [x] 19.5 Create `components/builder/ResumeBuilder.tsx`
    - `useReducer` for `ResumeData` state; handles `UPDATE_FIELD`, `SWITCH_TEMPLATE`, `REGENERATE_SECTION` actions
    - `REGENERATE_SECTION` calls `POST /api/optimize/section` and merges result back into state
    - Composes `TemplateSelector`, `SectionEditor`, and active template component
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 19.6 Write property test for inline edit state consistency
    - **Property 18: Inline edit state consistency**
    - **Validates: Requirements 8.2**

  - [x] 19.7 Write property test for section regeneration isolation
    - **Property 19: Section regeneration isolation**
    - **Validates: Requirements 8.3**

  - [x] 19.8 Write property test for template switch preserves data
    - **Property 20: Template switch preserves data**
    - **Validates: Requirements 8.4**

- [x] 20. Analysis panel components
  - [x] 20.1 Create `components/analysis/ATSScorePanel.tsx`
    - Score ring visualization, per-category breakdown bars, suggestions list
    - Calls `POST /api/ats-score` with current `ResumeData` and optional job description input
    - _Requirements: 4.1, 4.3, 4.4_

  - [x] 20.2 Create `components/analysis/BrandingPanel.tsx`
    - Tone badge, summary score display, UVP flag, headline/tagline/narrative suggestions
    - Calls `POST /api/branding`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 20.3 Create `components/analysis/LinkedInPanel.tsx`
    - Inconsistency list with priority badges, resume/LinkedIn suggestion columns, field import checkboxes
    - Calls `POST /api/linkedin/compare` and `POST /api/linkedin/import`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 21. Comparison and export components
  - [x] 21.1 Create `components/comparison/SideBySideView.tsx`
    - Renders original `ResumeData` and optimized `ResumeData` side by side using the active template
    - Highlights differing fields
    - _Requirements: 8.1, 8.2_

  - [x] 21.2 Create `components/export/ExportMenu.tsx`
    - PDF and DOCX download buttons; POST to respective export routes and trigger browser download
    - _Requirements: 9.1, 9.2_

- [x] 22. Dashboard page
  - [x] 22.1 Create `app/dashboard/page.tsx`
    - Wrapped in `AuthGuard`; fetches `GET /api/resumes` and renders resume cards ordered by `updatedAt` desc
    - Each card links to `/builder/[resumeId]`; includes delete button calling `DELETE /api/resumes/[resumeId]`
    - _Requirements: 11.2, 11.5_

- [x] 23. Builder page and version history
  - [x] 23.1 Create `app/builder/[resumeId]/page.tsx`
    - Wrapped in `AuthGuard`; loads resume data and renders `ResumeBuilder`, analysis panels, `SideBySideView`, `ExportMenu`
    - Version history sidebar: fetches `GET /api/resumes/[resumeId]/versions`; clicking a version loads it via `GET /api/resumes/[resumeId]/versions/[versionId]`
    - Auto-save on change calls `POST /api/resumes`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 11.1, 11.3_

- [x] 24. Shared UI primitives
  - Create `components/ui/GlassCard.tsx` — reusable glassmorphism card with Tailwind backdrop-blur
  - Create `components/ui/AnimatedSection.tsx` — Framer Motion fade-in wrapper
  - _Requirements: 8.1_

- [x] 25. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check with `numRuns: 100` minimum; each test comment must cite the property number and requirements clause
- Firebase Emulator Suite is used for Auth and Firestore in all tests — no real Firebase calls in CI
- OpenAI calls are mocked with `jest.mock` in all unit and property tests
- Puppeteer PDF tests check `process.env.SKIP_PUPPETEER` and skip gracefully in environments without Chromium
