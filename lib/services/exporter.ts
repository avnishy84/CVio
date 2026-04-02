/**
 * CVio — Exporter Service
 * Converts ResumeData into PDF (via Puppeteer) or DOCX (via docx library).
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

import puppeteer from "puppeteer";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from "docx";
import type { ResumeData, ExportResult } from "../../types/resume";

// ---------------------------------------------------------------------------
// HTML template renderer
// ---------------------------------------------------------------------------

function renderTemplateToHTML(data: ResumeData, template: string): string {
  const { personal_info, summary, skills, experience, education, projects } = data;

  const esc = (s: string | null | undefined) =>
    s ? s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";

  const experienceHTML = experience
    .map(
      (e) => `
      <div class="entry">
        <strong>${esc(e.title)}</strong> — ${esc(e.company)}
        <span class="dates">${esc(e.startDate)} – ${esc(e.endDate)}</span>
        ${e.location ? `<span class="location">${esc(e.location)}</span>` : ""}
        <ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
      </div>`
    )
    .join("");

  const educationHTML = education
    .map(
      (e) => `
      <div class="entry">
        <strong>${esc(e.degree)}${e.field ? ` in ${esc(e.field)}` : ""}</strong> — ${esc(e.institution)}
        <span class="dates">${esc(e.startDate)} – ${esc(e.endDate)}</span>
        ${e.gpa ? `<span>GPA: ${esc(e.gpa)}</span>` : ""}
      </div>`
    )
    .join("");

  const projectsHTML = projects
    .map(
      (p) => `
      <div class="entry">
        <strong>${esc(p.name)}</strong>
        ${p.url ? `<a href="${esc(p.url)}">${esc(p.url)}</a>` : ""}
        <p>${esc(p.description)}</p>
        ${p.technologies.length ? `<p><em>Technologies: ${p.technologies.map(esc).join(", ")}</em></p>` : ""}
      </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(personal_info.name)} | CVio Resume</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #222; }
    h1 { font-size: 2em; margin-bottom: 4px; }
    h2 { font-size: 1.2em; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 24px; }
    .contact { color: #555; font-size: 0.9em; margin-bottom: 16px; }
    .entry { margin-bottom: 12px; }
    .dates { color: #777; font-size: 0.85em; margin-left: 8px; }
    .location { color: #777; font-size: 0.85em; margin-left: 8px; }
    ul { margin: 4px 0 0 16px; padding: 0; }
    li { margin-bottom: 2px; }
  </style>
</head>
<body>
  <h1>${esc(personal_info.name)}</h1>
  <div class="contact">
    ${[personal_info.email, personal_info.phone, personal_info.location, personal_info.website, personal_info.linkedin]
      .filter(Boolean)
      .map(esc)
      .join(" &nbsp;|&nbsp; ")}
  </div>

  ${summary ? `<h2>Summary</h2><p>${esc(summary)}</p>` : ""}

  ${skills.length ? `<h2>Skills</h2><p>${skills.map(esc).join(", ")}</p>` : ""}

  ${experience.length ? `<h2>Experience</h2>${experienceHTML}` : ""}

  ${education.length ? `<h2>Education</h2>${educationHTML}` : ""}

  ${projects.length ? `<h2>Projects</h2>${projectsHTML}` : ""}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// PDF export
// ---------------------------------------------------------------------------

/**
 * Export ResumeData to PDF using Puppeteer.
 * If SKIP_PUPPETEER env var is set, returns a minimal placeholder buffer.
 *
 * Requirements: 9.1, 9.3, 9.4
 */
export async function exportToPDF(
  data: ResumeData,
  template: string
): Promise<ExportResult> {
  if (process.env.SKIP_PUPPETEER) {
    return {
      buffer: Buffer.from("PDF export skipped (SKIP_PUPPETEER is set)"),
      filename: "resume.pdf",
      mimeType: "application/pdf",
    };
  }

  // Dynamic import so tests can mock puppeteer easily
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    const html = renderTemplateToHTML(data, template);
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4" });

    return {
      buffer: Buffer.from(pdfBuffer),
      filename: "resume.pdf",
      mimeType: "application/pdf",
    };
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------
// DOCX export
// ---------------------------------------------------------------------------

/**
 * Export ResumeData to DOCX using the docx library.
 *
 * Requirements: 9.2, 9.3, 9.4
 */
export async function exportToDOCX(data: ResumeData): Promise<ExportResult> {
  const { personal_info, summary, skills, experience, education, projects } = data;

  const sections: Paragraph[] = [];

  // --- Name / header ---
  if (personal_info.name) {
    sections.push(
      new Paragraph({
        text: personal_info.name,
        heading: HeadingLevel.TITLE,
      })
    );
  }

  // --- Contact info ---
  const contactParts = [
    personal_info.email,
    personal_info.phone,
    personal_info.location,
    personal_info.website,
    personal_info.linkedin,
  ].filter(Boolean) as string[];

  if (contactParts.length) {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: contactParts.join("  |  "), size: 20 })],
      })
    );
  }

  // --- Summary ---
  if (summary) {
    sections.push(
      new Paragraph({ text: "Summary", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ children: [new TextRun(summary)] })
    );
  }

  // --- Skills ---
  if (skills.length) {
    sections.push(
      new Paragraph({ text: "Skills", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ children: [new TextRun(skills.join(", "))] })
    );
  }

  // --- Experience ---
  if (experience.length) {
    sections.push(
      new Paragraph({ text: "Experience", heading: HeadingLevel.HEADING_1 })
    );
    for (const e of experience) {
      const titleLine = [e.title, e.company].filter(Boolean).join(" — ");
      const dateLine = [e.startDate, e.endDate].filter(Boolean).join(" – ");
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: titleLine, bold: true })],
        }),
        new Paragraph({
          children: [new TextRun({ text: dateLine, size: 18, color: "777777" })],
        })
      );
      for (const bullet of e.bullets) {
        sections.push(
          new Paragraph({ children: [new TextRun(`• ${bullet}`)] })
        );
      }
    }
  }

  // --- Education ---
  if (education.length) {
    sections.push(
      new Paragraph({ text: "Education", heading: HeadingLevel.HEADING_1 })
    );
    for (const e of education) {
      const degreeLine = [e.degree, e.field ? `in ${e.field}` : null, e.institution]
        .filter(Boolean)
        .join(" ");
      const dateLine = [e.startDate, e.endDate].filter(Boolean).join(" – ");
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: degreeLine, bold: true })],
        }),
        new Paragraph({
          children: [new TextRun({ text: dateLine, size: 18, color: "777777" })],
        })
      );
      if (e.gpa) {
        sections.push(
          new Paragraph({ children: [new TextRun(`GPA: ${e.gpa}`)] })
        );
      }
    }
  }

  // --- Projects ---
  if (projects.length) {
    sections.push(
      new Paragraph({ text: "Projects", heading: HeadingLevel.HEADING_1 })
    );
    for (const p of projects) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: p.name ?? "", bold: true })],
        })
      );
      if (p.description) {
        sections.push(
          new Paragraph({ children: [new TextRun(p.description)] })
        );
      }
      if (p.technologies.length) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: `Technologies: ${p.technologies.join(", ")}`, italics: true }),
            ],
          })
        );
      }
      if (p.url) {
        sections.push(
          new Paragraph({ children: [new TextRun(p.url)] })
        );
      }
    }
  }

  const doc = new Document({
    sections: [{ children: sections }],
  });

  const buffer = await Packer.toBuffer(doc);

  return {
    buffer: Buffer.from(buffer),
    filename: "resume.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}
