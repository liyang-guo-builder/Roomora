import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { LandingLuxe } from "@/components/landing/LandingLuxe";

/**
 * Marketing homepage. Fonts are scoped here (and to the landing components) so
 * they never load on the app screens under /app.
 *  - Playfair Display: display / headings (regular + italic)
 *  - Inter: body / UI / letter-spaced eyebrows
 */
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const title = "Roomora · Fall for the room you already have";
const description =
  "AI interior redesign that keeps your real room. Same walls, windows and light, restyled into the look you love in 30 seconds, then shop the look in one tap.";

export const metadata: Metadata = {
  metadataBase: new URL("https://room-ora.com"),
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://room-ora.com",
    siteName: "Roomora",
    title,
    description,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Roomora" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.jpg"],
  },
};

export default function HomePage() {
  return (
    <div className={`${playfair.variable} ${inter.variable}`}>
      <LandingLuxe />
    </div>
  );
}
