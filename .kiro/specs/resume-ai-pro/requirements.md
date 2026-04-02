# Requirements Document

## Introduction

ResumeAI Pro is a production-ready SaaS web application that enables users to upload their resume and receive AI-powered optimization, ATS scoring, role-specific tailoring, personal branding insights, LinkedIn profile comparison, and multi-format export. The system is built on Next.js with OpenAI API integration and supports a full user account system with resume versioning.

## Glossary

- **System**: The ResumeAI Pro web application as a whole
- **Parser**: The component responsible for extracting structured data from uploaded resume files
- **Resume_Data**: The structured JSON object containing all extracted and optimized resume fields
- **ATS_Scorer**: The component that evaluates a resume against ATS criteria and produces a scored breakdown
- **AI_Optimizer**: The component that communicates with the OpenAI API to rewrite and improve resume content
- **Role_Optimizer**: The component that applies role-specific keyword, structure, and tone adjustments to a resume
- **Branding_Analyzer**: The component that evaluates professional summary, tone, and unique value proposition
- **LinkedIn_Comparator**: The component that compares resume data against a LinkedIn profile and surfaces inconsistencies
- **Resume_Builder**: The component that renders Resume_Data into a visual template with inline editing support
- **Exporter**: The component that converts Resume_Data into PDF or DOCX output files
- **Auth_Service**: The component responsible for user authentication and session management
- **Version_Store**: The component that persists and retrieves historical versions of a user's resumes
- **Dashboard**: The user-facing page that lists saved resumes and provides access to all features
- **Job_Description**: A plain-text or pasted job posting used as the reference for ATS keyword matching
- **ATS_Score**: A numeric value from 0 to 100 representing how well a resume satisfies ATS criteria
- **Template**: A named visual layout (Notion-style, Apple-style, ATS-friendly) used by the Resume_Builder

---

## Requirements

### Requirement 1: Resume Upload

**User Story:** As a job seeker, I want to upload my resume in PDF or DOCX format, so that the system can process and analyze it.

#### Acceptance Criteria

1. THE System SHALL accept resume file uploads in PDF and DOCX formats only.
2. WHEN a file exceeding 10 MB is uploaded, THE System SHALL reject the file and return an error message stating the size limit.
3. WHEN a file with an unsupported format is uploaded, THE System SHALL reject the file and return an error message listing the accepted formats.
4. WHEN a valid resume file is uploaded, THE System SHALL store the file temporarily and pass it to the Parser within 3 seconds.

---

### Requirement 2: Resume Parsing

**User Story:** As a job seeker, I want my uploaded resume to be parsed into structured data, so that the system can analyze and optimize each section individually.

#### Acceptance Criteria

1. WHEN a valid PDF file is provided, THE Parser SHALL extract structured Resume_Data using pdf-parse.
2. WHEN a valid DOCX file is provided, THE Parser SHALL extract structured Resume_Data using mammoth.
3. THE Parser SHALL extract the following fields from the resume: personal_info, summary, skills, experience, projects, and education.
4. IF the Parser cannot extract one or more required fields, THEN THE Parser SHALL return a partial Resume_Data object with null values for missing fields and include a list of unextracted fields in the response.
5. THE System SHALL parse a resume file and return Resume_Data within 10 seconds of upload completion.
6. THE Parser SHALL produce Resume_Data that, when re-parsed after export, yields an equivalent structured object (round-trip property).

---

### Requirement 3: AI Resume Optimization

**User Story:** As a job seeker, I want my resume content rewritten by AI, so that it uses strong action verbs, clear language, and quantified achievements.

#### Acceptance Criteria

1. WHEN a Resume_Data object is submitted for optimization, THE AI_Optimizer SHALL rewrite experience and summary fields using strong action verbs.
2. WHEN a Resume_Data object is submitted for optimization, THE AI_Optimizer SHALL improve grammar and clarity in all text fields.
3. WHEN a Resume_Data object is submitted for optimization, THE AI_Optimizer SHALL suggest quantified metrics for achievement statements that lack measurable outcomes.
4. THE AI_Optimizer SHALL return only content derived from the original Resume_Data and SHALL NOT introduce fabricated employers, titles, dates, or credentials.
5. WHEN the OpenAI API returns an error, THE AI_Optimizer SHALL return the original unmodified Resume_Data along with an error message describing the failure.
6. THE AI_Optimizer SHALL complete optimization and return a result within 30 seconds of receiving a Resume_Data object.

---

### Requirement 4: ATS Scoring

**User Story:** As a job seeker, I want to receive an ATS score with a detailed breakdown, so that I know exactly how to improve my resume for applicant tracking systems.

#### Acceptance Criteria

1. WHEN a Resume_Data object and a Job_Description are provided, THE ATS_Scorer SHALL compute an ATS_Score from 0 to 100.
2. THE ATS_Scorer SHALL compute the ATS_Score as a weighted sum: Keyword Match (30%), Formatting and Readability (20%), Section Completeness (15%), Impact and Metrics Usage (15%), Skills Relevance (10%), and Experience Depth (10%).
3. THE ATS_Scorer SHALL return a breakdown object containing the individual score for each of the six weighted categories.
4. THE ATS_Scorer SHALL return a list of at least three actionable improvement suggestions when the ATS_Score is below 80.
5. WHEN no Job_Description is provided, THE ATS_Scorer SHALL compute the ATS_Score using only the non-keyword categories and SHALL indicate that keyword matching was skipped.
6. THE ATS_Scorer SHALL produce a deterministic score for the same Resume_Data and Job_Description inputs.

---

### Requirement 5: Role-Based Optimization

**User Story:** As a job seeker, I want my resume tailored to a specific target role, so that it emphasizes the most relevant keywords, skills, and tone for that profession.

#### Acceptance Criteria

1. THE System SHALL support the following target roles: Software Developer, UI/UX Designer, Product Manager, HR, and Marketing.
2. WHEN a target role is selected, THE Role_Optimizer SHALL adjust keyword emphasis, skills ordering, resume structure, and tone to match the conventions of that role.
3. WHEN a target role is selected, THE Role_Optimizer SHALL return an updated Resume_Data object reflecting the role-specific adjustments.
4. WHEN an unsupported role value is submitted, THE Role_Optimizer SHALL return a validation error listing the supported roles.

---

### Requirement 6: Personal Branding Insights

**User Story:** As a job seeker, I want to receive personal branding feedback on my resume, so that I can present a compelling and differentiated professional identity.

#### Acceptance Criteria

1. WHEN a Resume_Data object is submitted, THE Branding_Analyzer SHALL rate the professional summary on a scale of 1 to 10.
2. WHEN a Resume_Data object is submitted, THE Branding_Analyzer SHALL classify the overall tone of the resume (e.g., formal, technical, creative, neutral).
3. WHEN the Resume_Data summary does not contain a unique value proposition, THE Branding_Analyzer SHALL flag this and return a suggestion for adding one.
4. THE Branding_Analyzer SHALL return at least one suggestion for a strong headline, one personal tagline, and one career narrative framing.

---

### Requirement 7: LinkedIn Integration

**User Story:** As a job seeker, I want to compare my resume against my LinkedIn profile, so that I can identify inconsistencies and improve both.

#### Acceptance Criteria

1. THE System SHALL accept LinkedIn profile data via a pasted LinkedIn profile URL or an uploaded LinkedIn PDF export.
2. WHEN LinkedIn profile data is provided, THE LinkedIn_Comparator SHALL compare it against the current Resume_Data and return a list of inconsistencies in fields including job titles, dates, skills, and education.
3. WHEN inconsistencies are found, THE LinkedIn_Comparator SHALL return a prioritized list of suggested corrections for both the resume and the LinkedIn profile.
4. WHEN the user requests it, THE System SHALL import LinkedIn profile data into the current Resume_Data, overwriting only the fields the user explicitly selects.
5. IF the LinkedIn URL is inaccessible or the PDF cannot be parsed, THEN THE LinkedIn_Comparator SHALL return an error message and preserve the existing Resume_Data unchanged.

---

### Requirement 8: Resume Builder

**User Story:** As a job seeker, I want to view and edit my optimized resume in a visual builder, so that I can fine-tune the content and choose a presentation style.

#### Acceptance Criteria

1. THE Resume_Builder SHALL render Resume_Data using one of three named Templates: Notion-style, Apple-style, and ATS-friendly.
2. WHEN a user edits a field inline, THE Resume_Builder SHALL update the corresponding field in Resume_Data in real time.
3. WHEN a user requests section-wise regeneration, THE Resume_Builder SHALL send only that section's data to the AI_Optimizer and merge the result back into Resume_Data.
4. WHEN the user switches Templates, THE Resume_Builder SHALL re-render the current Resume_Data in the selected Template without data loss.

---

### Requirement 9: Export

**User Story:** As a job seeker, I want to export my resume as a PDF or DOCX file, so that I can submit it to employers in the format they require.

#### Acceptance Criteria

1. THE Exporter SHALL generate a PDF file from the current Resume_Data using puppeteer or html-pdf.
2. THE Exporter SHALL generate a DOCX file from the current Resume_Data using the docx library.
3. WHEN an export is requested, THE Exporter SHALL produce the output file within 15 seconds.
4. THE Exporter SHALL preserve all Resume_Data fields in the exported file with pixel-accurate formatting relative to the selected Template.
5. FOR ALL valid Resume_Data objects, exporting to PDF and then parsing the exported PDF SHALL produce a Resume_Data object equivalent to the original (round-trip property).

---

### Requirement 10: User Authentication

**User Story:** As a user, I want to create an account and log in, so that my resumes are saved securely and accessible across sessions.

#### Acceptance Criteria

1. THE Auth_Service SHALL support user registration and login using email and password.
2. WHEN a user submits valid credentials, THE Auth_Service SHALL establish an authenticated session within 3 seconds.
3. IF a user submits invalid credentials, THEN THE Auth_Service SHALL return an error message and SHALL NOT establish a session.
4. WHILE a user session is active, THE System SHALL restrict access to that user's Resume_Data and version history only.

---

### Requirement 11: Resume Persistence and Version History

**User Story:** As a user, I want my resumes saved automatically with version history, so that I can return to a previous version if needed.

#### Acceptance Criteria

1. WHEN a user saves a resume, THE Version_Store SHALL persist the current Resume_Data along with a timestamp and an auto-incremented version number.
2. THE Dashboard SHALL display all saved resumes for the authenticated user, ordered by most recently modified.
3. WHEN a user selects a previous version, THE System SHALL load that version's Resume_Data into the Resume_Builder.
4. THE Version_Store SHALL retain at least 10 versions per resume per user.
5. WHEN a user deletes a resume, THE Version_Store SHALL remove all versions of that resume and return a confirmation.
