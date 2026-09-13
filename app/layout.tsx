import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TheClinixAI QualityOne",
  description: "Integrated Quality Management and Learning platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
