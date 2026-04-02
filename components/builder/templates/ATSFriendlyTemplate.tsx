"use client";

/**
 * CVio — ATS-friendly resume template
 * Plain text, no fancy styling, standard sections for maximum ATS compatibility.
 * Requirements: 8.1
 */

import React from "react";
import type { ResumeData } from "../../../types/resume";

interface ATSFriendlyTemplateProps {
  data: ResumeData;
}

export default function ATSFriendlyTemplate({ data }: ATSFriendlyTemplateProps) {
  const { personal_info, summary, skills, experience, education, projects } = data;

  return (
    <div
      className="ats-friendly-template"
      style={{
        fontFamily: "'Arial', 'Helvetica', sans-serif",
        maxWidth: "800px",
        margin: "0 auto",
        padding: "32px 40px",
        color: "#000000",
        backgroundColor: "#ffffff",
        lineHeight: "1.5",
        fontSize: "11pt",
      }}
    >
      {/* Personal Info */}
      <header style={{ marginBottom: "16px" }}>
        {personal_info.name && (
          <div style={{ fontSize: "16pt", fontWeight: "bold", marginBottom: "4px" }}>
            {personal_info.name}
          </div>
        )}
        <div style={{ fontSize: "10pt" }}>
          {[
            personal_info.email,
            personal_info.phone,
            personal_info.location,
            personal_info.website,
            personal_info.linkedin,
          ]
            .filter(Boolean)
            .join(" | ")}
        </div>
      </header>

      <hr style={{ border: "none", borderTop: "1px solid #000", margin: "8px 0 16px 0" }} />

      {/* Summary */}
      {summary && (
        <section style={{ marginBottom: "16px" }}>
          <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11pt", marginBottom: "4px", borderBottom: "1px solid #000" }}>
            Summary
          </div>
          <p style={{ margin: "4px 0 0 0" }}>{summary}</p>
        </section>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <section style={{ marginBottom: "16px" }}>
          <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11pt", marginBottom: "4px", borderBottom: "1px solid #000" }}>
            Skills
          </div>
          <p style={{ margin: "4px 0 0 0" }}>{skills.join(", ")}</p>
        </section>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <section style={{ marginBottom: "16px" }}>
          <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11pt", marginBottom: "8px", borderBottom: "1px solid #000" }}>
            Experience
          </div>
          {experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "bold" }}>{exp.title || "Untitled Role"}</span>
                <span>
                  {exp.startDate}{exp.endDate ? ` - ${exp.endDate}` : ""}
                </span>
              </div>
              <div>
                {exp.company}{exp.location ? `, ${exp.location}` : ""}
              </div>
              {exp.bullets.length > 0 && (
                <ul style={{ margin: "4px 0 0 0", paddingLeft: "20px" }}>
                  {exp.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <section style={{ marginBottom: "16px" }}>
          <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11pt", marginBottom: "8px", borderBottom: "1px solid #000" }}>
            Education
          </div>
          {education.map((edu, i) => (
            <div key={i} style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "bold" }}>{edu.institution || "Institution"}</span>
                <span>
                  {edu.startDate}{edu.endDate ? ` - ${edu.endDate}` : ""}
                </span>
              </div>
              <div>
                {edu.degree}{edu.field ? `, ${edu.field}` : ""}
                {edu.gpa ? ` | GPA: ${edu.gpa}` : ""}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <section style={{ marginBottom: "16px" }}>
          <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11pt", marginBottom: "8px", borderBottom: "1px solid #000" }}>
            Projects
          </div>
          {projects.map((proj, i) => (
            <div key={i} style={{ marginBottom: "8px" }}>
              <div style={{ fontWeight: "bold" }}>
                {proj.name || "Project"}
                {proj.url ? ` | ${proj.url}` : ""}
              </div>
              {proj.description && <div>{proj.description}</div>}
              {proj.technologies.length > 0 && (
                <div>Technologies: {proj.technologies.join(", ")}</div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
