import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "CVio — AI Resume Builder & ATS Optimizer",
  description:
    "CVio is your AI-powered resume builder and ATS optimizer. Tailor your CV for any role, get instant ATS scores, and land more interviews.",
  openGraph: {
    title: "CVio — AI Resume Builder & ATS Optimizer",
    description:
      "CVio is your AI-powered resume builder and ATS optimizer. Tailor your CV for any role and get instant ATS scores.",
    siteName: "CVio",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
