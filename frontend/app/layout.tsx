import type { Metadata } from "next";
import "./globals.css";
import AppLayout from "@/components/AppLayout";

export const metadata: Metadata = {
  title: "VIGINT — Intelligent Campus Safety & Emergency Response Platform",
  description:
    "End-to-end autonomous smart campus safety platform with multi-modal CCTV analytics, IoT sensor grid consensus, Dempster-Shafer evidential fusion, and P1-P4 emergency incident escalation.",
  keywords: ["VIGINT", "Campus Safety", "SIH", "AI CCTV", "IoT Sensor Fusion", "Dempster-Shafer", "Face Re-ID", "Emergency Dispatch"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}

