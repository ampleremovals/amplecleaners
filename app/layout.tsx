import type { Metadata } from "next";
import { Unbounded, Manrope } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

// Unbounded — chunky, rounded, confident display face. Carries the "colourful
// and pronounced" brand energy the homepage is built around.
const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

// Manrope — warm geometric body sans, distinct from the generic Inter/Arial
// defaults, still highly legible at small sizes.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ample Cleaners — Professional Cleaning Services UK",
    template: "%s | Ample Cleaners",
  },
  description:
    "Professional cleaning services across the UK. Regular cleaning, deep cleaning, end of tenancy, office and after-builders cleaning. Get a fixed-price quote in minutes.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: "Ample Cleaners",
    description: "Professional regular, deep, end of tenancy, office and after-builders cleaning across the UK.",
    url: site,
    areaServed: "United Kingdom",
    priceRange: "££",
  };

  return (
    <html lang="en" className={cn(unbounded.variable, manrope.variable)}>
      <body className="font-sans antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
