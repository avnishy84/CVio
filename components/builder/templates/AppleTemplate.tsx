"use client";

/**
 * CVio — Apple-style resume template
 * Elegant, lots of whitespace, sans-serif, centered header.
 * Requirements: 8.1
 */

import React from "react";
import type { ResumeData } from "../../../types/resume";

interface AppleTemplateProps {
  data: ResumeData;
}

export default function AppleTemplate({ data }: AppleTemplateProps) {
  const { personal_info, summary, skills, experience, education, projects } = data;

  return (
    <div
      className="apple-template"
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
        maxWidth: "760px",
        margin: "0 auto",
        padding: "64px 48px",
        color: "#1d1d1f",
        backgroundColor: "#ffffff",
        lineHeight: "1.7",
      }}
    >
      {/* Centered Header */}
      <header style={{ textAlign: "center", marginBottom: "48px" }}>
        {personal_info.name && (
          <h1 style={{ fontSize: "2.25rem", fontWeight: "300", letterSpacing: "-0.02em", margin: "0 0 12px 0", color: "#1d1d1f" }}>
            {personal_info.name}
          </h1>
        )}
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "16px", fontSize: "0.875rem", color: "#6e6e73" }}>
          {personal_info.email && <span>{personal_info.email}</span>}
          {personal_info.phone && <span>{personal_info.phone}</span>}
          {personal_info.location && <span>{personal_info.location}</span>}
          {personal_info.website && <span>{personal_info.website}</span>}
          {personal_info.linkedin && <span>{personal_info.linkedin}</span>}
        </div>
      </header>

      {/* Summary */}
      {summary && (
        <section style={{ marginBottom: "40px", textAlign: "center" }}>
          <p style={{ fontSize: "1.05rem", color: "#3a3a3c", maxWidth: "560px", margin: "0 auto", fontWeight: "300" }}>
            {summary}
          </p>
        </section>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "0.7rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.12em", color: "#6e6e73", marginBottom: "16px", textAlign: "center" }}>
            Skills
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
            {skills.map((skill, i) => (
              <span
                key={i}
                style={{
                  border: "1px solid #d2d2d7",
                  borderRadius: "20px",
                  padding: "4px 14px",
                  fontSize: "0.85rem",
                  color: "#1d1d1f",
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
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "0.7rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.12em", color: "#6e6e73", marginBottom: "24px", textAlign: "center" }}>
            Experience
          </h2>
          {experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: "32px", paddingBottom: "32px", borderBottom: i < experience.length - 1 ? "1px solid #f5f5f7" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                <div>
                  <div style={{ fontSize: "1.05rem", fontWeight: "500" }}>{exp.title || "Untitled Role"}</div>
                  <div style={{ fontSize: "0.9rem", color: "#6e6e73" }}>
                    {exp.company}{exp.location ? ` · ${exp.location}` : ""}
                  </div>
                </div>
                <div style={{ fontSize: "0.85rem", color: "#6e6e73", textAlign: "right", flexShrink: 0, marginLeft: "16px" }}>
                  {exp.startDate}{exp.endDate ? ` – ${exp.endDate}` : ""}
                </div>
              </div>
              {exp.bullets.length > 0 && (
                <ul style={{ margin: "12px 0 0 0", paddingLeft: "20px" }}>
                  {exp.bullets.map((b, j) => (
                    <li key={j} style={{ fontSize: "0.9rem", color: "#3a3a3c", marginBottom: "4px" }}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "0.7rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.12em", color: "#6e6e73", marginBottom: "24px", textAlign: "center" }}>
            Education
          </h2>
          {education.map((edu, i) => (
            <div key={i} style={{ marginBottom: "24px", textAlign: "center" }}>
              <div style={{ fontSize: "1.05rem", fontWeight: "500" }}>{edu.institution || "Institution"}</div>
              <div style={{ fontSize: "0.9rem", color: "#6e6e73" }}>
                {edu.degree}{edu.field ? ` in ${edu.field}` : ""}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#6e6e73" }}>
                {edu.startDate}{edu.endDate ? ` – ${edu.endDate}` : ""}
                {edu.gpa ? ` · GPA: ${edu.gpa}` : ""}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <section style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "0.7rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.12em", color: "#6e6e73", marginBottom: "24px", textAlign: "center" }}>
            Projects
          </h2>
          {projects.map((proj, i) => (
            <div key={i} style={{ marginBottom: "24px", paddingBottom: "24px", borderBottom: i < projects.length - 1 ? "1px solid #f5f5f7" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: "1.05rem", fontWeight: "500" }}>{proj.name || "Project"}</div>
                {proj.url && <span style={{ fontSize: "0.85rem", color: "#6e6e73" }}>{proj.url}</span>}
              </div>
              {proj.description && (
                <p style={{ margin: "6px 0", fontSize: "0.9rem", color: "#3a3a3c" }}>{proj.description}</p>
              )}
              {proj.technologies.length > 0 && (
                <div style={{ fontSize: "0.85rem", color: "#6e6e73" }}>{proj.technologies.join(" · ")}</div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
