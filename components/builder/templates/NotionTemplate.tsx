"use client";

/**
 * CVio — Notion-style resume template
 * Clean, minimal, serif font, block-based layout.
 * Requirements: 8.1
 */

import React from "react";
import type { ResumeData } from "../../../types/resume";

interface NotionTemplateProps {
  data: ResumeData;
}

export default function NotionTemplate({ data }: NotionTemplateProps) {
  const { personal_info, summary, skills, experience, education, projects } = data;

  return (
    <div
      className="notion-template"
      style={{
        fontFamily: "'Georgia', 'Times New Roman', serif",
        maxWidth: "800px",
        margin: "0 auto",
        padding: "48px 40px",
        color: "#37352f",
        backgroundColor: "#ffffff",
        lineHeight: "1.6",
      }}
    >
      {/* Personal Info */}
      <header style={{ marginBottom: "32px", borderBottom: "1px solid #e9e9e7", paddingBottom: "24px" }}>
        {personal_info.name && (
          <h1 style={{ fontSize: "2rem", fontWeight: "700", margin: "0 0 8px 0", color: "#37352f" }}>
            {personal_info.name}
          </h1>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "0.9rem", color: "#6b6b6b" }}>
          {personal_info.email && <span>{personal_info.email}</span>}
          {personal_info.phone && <span>{personal_info.phone}</span>}
          {personal_info.location && <span>{personal_info.location}</span>}
          {personal_info.website && <span>{personal_info.website}</span>}
          {personal_info.linkedin && <span>{personal_info.linkedin}</span>}
        </div>
      </header>

      {/* Summary */}
      {summary && (
        <section style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9b9a97", marginBottom: "8px" }}>
            Summary
          </h2>
          <p style={{ margin: 0, fontSize: "0.95rem" }}>{summary}</p>
        </section>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <section style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9b9a97", marginBottom: "8px" }}>
            Skills
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {skills.map((skill, i) => (
              <span
                key={i}
                style={{
                  background: "#f1f1ef",
                  borderRadius: "4px",
                  padding: "2px 8px",
                  fontSize: "0.875rem",
                  color: "#37352f",
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <section style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9b9a97", marginBottom: "12px" }}>
            Experience
          </h2>
          {experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2px" }}>
                <strong style={{ fontSize: "1rem" }}>{exp.title || "Untitled Role"}</strong>
                <span style={{ fontSize: "0.85rem", color: "#9b9a97" }}>
                  {exp.startDate}{exp.endDate ? ` – ${exp.endDate}` : ""}
                </span>
              </div>
              <div style={{ fontSize: "0.9rem", color: "#6b6b6b", marginBottom: "6px" }}>
                {exp.company}{exp.location ? `, ${exp.location}` : ""}
              </div>
              {exp.bullets.length > 0 && (
                <ul style={{ margin: "4px 0 0 0", paddingLeft: "20px" }}>
                  {exp.bullets.map((b, j) => (
                    <li key={j} style={{ fontSize: "0.9rem", marginBottom: "2px" }}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <section style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9b9a97", marginBottom: "12px" }}>
            Education
          </h2>
          {education.map((edu, i) => (
            <div key={i} style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: "1rem" }}>{edu.institution || "Institution"}</strong>
                <span style={{ fontSize: "0.85rem", color: "#9b9a97" }}>
                  {edu.startDate}{edu.endDate ? ` – ${edu.endDate}` : ""}
                </span>
              </div>
              <div style={{ fontSize: "0.9rem", color: "#6b6b6b" }}>
                {edu.degree}{edu.field ? ` in ${edu.field}` : ""}
                {edu.gpa ? ` · GPA: ${edu.gpa}` : ""}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <section style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9b9a97", marginBottom: "12px" }}>
            Projects
          </h2>
          {projects.map((proj, i) => (
            <div key={i} style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: "1rem" }}>{proj.name || "Project"}</strong>
                {proj.url && (
                  <span style={{ fontSize: "0.85rem", color: "#9b9a97" }}>{proj.url}</span>
                )}
              </div>
              {proj.description && (
                <p style={{ margin: "4px 0", fontSize: "0.9rem" }}>{proj.description}</p>
              )}
              {proj.technologies.length > 0 && (
                <div style={{ fontSize: "0.85rem", color: "#6b6b6b" }}>
                  {proj.technologies.join(", ")}
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
