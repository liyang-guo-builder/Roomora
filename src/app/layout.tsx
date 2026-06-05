import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Roomora · Redesign your real room",
  description:
    "Turn a photo of your real room into a realistically restyled version that stays recognizably your room.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Roomora" },
  // Serve the home-screen icon at the classic clean path (no hashed query) that
  // iOS Safari probes + caches; helps it pick up the real colorful mark instead
  // of an auto-generated letter fallback.
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = { themeColor: "#7C8866" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${schibsted.variable} ${notoSC.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
