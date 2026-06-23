import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { LandingLuxe } from "@/components/landing/LandingLuxe";

/**
 * Marketing fonts, scoped to the landing preview route only so they never load
 * on the app screens. Exposed as CSS variables consumed by the luxe components.
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

export const metadata: Metadata = {
  title: "Roomora · Fall for the room you already have",
  description:
    "AI interior redesign that keeps your real room. Same walls, windows and light, restyled into the look you love in 30 seconds, then shop the look in one tap.",
};

export default function LandingPreviewPage() {
  return (
    <div className={`${playfair.variable} ${inter.variable}`}>
      <LandingLuxe />
    </div>
  );
}
