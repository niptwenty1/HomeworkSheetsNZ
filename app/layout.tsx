import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://homework-app.co.nz"),
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
  return (
    <html lang="en-NZ">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
