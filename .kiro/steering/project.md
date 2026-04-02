# CVio — Project Steering

## Product Name

The product name is **CVio**. Always refer to the application as "CVio" in all user-facing content, code comments, metadata, and documentation.

## SEO Guidelines

- The primary SEO keyword is **CVio**. Use it naturally in page titles, meta descriptions, headings, and alt text throughout the app.
- Secondary keywords to pair with CVio: "AI resume builder", "ATS resume optimizer", "resume tailoring", "CV optimization".
- Every public-facing page must include a `<title>` tag and `<meta name="description">` that contains the word "CVio".
- The canonical brand name in `<title>` tags should follow the pattern: `{Page Name} | CVio` (e.g. "Dashboard | CVio", "Build Your Resume | CVio").
- Open Graph tags (`og:title`, `og:description`, `og:site_name`) must also reference CVio.

## Naming Conventions

- App display name: **CVio**
- Internal code references (variable names, comments): use `cvio` or `CVio` — never `resumeAIPro` or `resume-ai-pro` in user-facing strings.
- The spec directory `.kiro/specs/resume-ai-pro/` retains its path for continuity but all user-facing content uses CVio.

## Test Execution

- Always run tests autonomously using `npm test -- --run` (or `npx jest --run`). Never ask the user to run tests manually.
- Do not prompt the user to click "run" or execute any test command — just run it directly.
- If tests fail, attempt to fix the issues and re-run automatically before reporting results.

## Content Tone

- Professional but approachable — CVio helps job seekers feel confident, not overwhelmed.
- Copy should be concise and action-oriented (e.g. "Optimize your CV with CVio", "Get your CVio ATS score").
