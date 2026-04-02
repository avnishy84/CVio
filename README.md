# CVio — AI-Powered Resume Builder & Optimizer

CVio is a production-ready SaaS web application that helps job seekers craft standout resumes. Upload your CV, get an ATS score, optimize with AI, tailor it to your target role, and export in PDF or DOCX — all in one place.

## Features

- **AI Resume Optimization** — Rewrites your resume with strong action verbs and quantified achievements
- **ATS Scoring** — Weighted breakdown across 6 categories so you know exactly what to fix
- **Role-Based Tailoring** — Optimizes your CV for Software Developer, UI/UX Designer, Product Manager, HR, or Marketing roles
- **Personal Branding Insights** — Tone analysis, UVP detection, headline and tagline suggestions
- **LinkedIn Comparison** — Surfaces inconsistencies between your resume and LinkedIn profile
- **Multi-Format Export** — Download your polished CV as PDF or DOCX

## Tech Stack

- [Next.js 14](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com) with glassmorphism UI
- [OpenAI GPT-4o](https://openai.com) for all AI features
- [Firebase](https://firebase.google.com) Auth + Firestore
- [Puppeteer](https://pptr.dev) for PDF export
- [docx](https://docx.js.org) for DOCX export

## Getting Started

Copy the example env file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see CVio running locally.

## Testing

```bash
npm test              # run all tests once
npm run test:coverage # with coverage report
```

Tests use Jest + ts-jest + fast-check for property-based testing. Firebase Emulator Suite is used for Auth and Firestore — no real Firebase calls in CI.

## Environment Variables

See `.env.local.example` for the full list of required variables (`OPENAI_API_KEY`, `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_*`).
