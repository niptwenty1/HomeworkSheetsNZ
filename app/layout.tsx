import type { Metadata } from "next";
import Link from "next/link";
import { Instagram } from "lucide-react";
import SiteHeader from "./SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://homeworksheets.co.nz"),
  title: "HomeWorkSheets | Weekly Learning Plans for NZ Parents",
  description:
    "NZ curriculum-aligned worksheets delivered straight to your inbox, helping your child build confidence through consistent practice without adding to your mental load.",
  applicationName: "HomeWorkSheets",
  authors: [{ name: "HomeWorkSheets" }],
  creator: "HomeWorkSheets",
  openGraph: {
    title: "HomeWork Sheets | Weekly Learning Plans for NZ Parents",
    description:
      "NZ curriculum-aligned worksheets delivered straight to your inbox, helping your child build confidence through consistent practice without adding to your mental load.",
    type: "website",
    locale: "en_NZ",
    images: [
      {
        url: "/homework-app-preview.png",
        width: 1024,
        height: 1024,
        alt: "A tactile 3D preview of the HomeWork App weekly learning plan interface",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HomeWork App | Weekly Learning Plans for NZ Parents",
    description:
      "Simple weekly learning plans for busy NZ parents, aligned to the curriculum and designed to reduce the mental load.",
    images: ["/homework-app-preview.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const instagramHandle = "homeworksheetsnz";
  const instagramUrl = `https://www.instagram.com/${instagramHandle}`;

  return (
    <html lang="en-NZ">
      <body>
        <SiteHeader />
        {children}
        <footer className="px-4 pb-8 pt-10 sm:px-6">
          <div className="mx-auto max-w-6xl rounded-3xl border border-white/70 bg-[#fff8eb]/75 px-5 py-5 text-sm text-[#6d6255] shadow-[0_18px_40px_-28px_rgba(80,68,54,0.55)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 font-semibold">Questions or feedback? We would love to hear from you.</p>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow us on Instagram"
                  className="ig-pill inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-extrabold text-white transition hover:-translate-y-0.5"
                >
                  <span className="ig-orb inline-flex h-6 w-6 items-center justify-center rounded-full">
                    <Instagram className="h-4 w-4" />
                  </span>
                  @{instagramHandle}
                </a>
                <Link
                  href="/contact"
                  className="rounded-2xl bg-[#a9d8d0] px-4 py-2 font-black text-[#2a2722] shadow-[0_6px_0_#77afa6] transition hover:-translate-y-0.5 active:translate-y-1"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
