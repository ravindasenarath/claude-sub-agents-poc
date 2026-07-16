import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Property Listing Platform",
    template: "%s | Property Listing Platform",
  },
  description:
    "Browse property listings for sale or rent, or sign in as an agent to manage your own listings.",
};

/**
 * Root layout shared by every route.
 *
 * This file only owns document-level concerns (html/body, fonts, base
 * metadata). Surface-specific chrome (header/nav/footer) lives in the
 * `(public)` and `agent` layouts so the public (unauthenticated) and agent
 * (authenticated) surfaces stay cleanly separated per module-boundaries.md.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
