import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "./globals.css";
import "./night.css";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
export const metadata: Metadata = {
  title: "LeadPilot AI | Lead intelligence, thoughtfully built",
  description:
    "Turn every inquiry into an opportunity. Explore an isolated, synthetic sales workspace with explainable lead scoring and human-reviewed drafts.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
