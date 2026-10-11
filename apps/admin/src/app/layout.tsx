import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Shujog Admin",
    template: "%s — Shujog Admin",
  },
  description: "Content management portal for Shujog — the Khulna student ecosystem app.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning on <html>/<body>: browser extensions
    // (Grammarly, Dark Reader, password managers…) inject attributes like
    // data-gr-ext-installed before React hydrates, which otherwise logs a
    // scary-but-harmless hydration mismatch. This only silences attribute
    // diffs on these two elements — real mismatches elsewhere still error.
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
