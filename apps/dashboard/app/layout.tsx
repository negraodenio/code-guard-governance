import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeGuard AI — AI Governance OS",
  description:
    "AI Governance Operating System for any organisation that develops, deploys, operates or supervises AI systems. Multi-industry. Multi-framework. Agent-centric.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background-dark text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}