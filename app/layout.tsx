import type { Metadata } from "next";
import { Unbounded, Manrope } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { AREAS } from "@/lib/seo/areas";
import { getPricing } from "@/lib/pricing-config";

// Both are variable fonts, so no `weight` list is needed — one file per script subset covers every weight.
// Unbounded — chunky, rounded, confident display face. Carries the "colourful
// and pronounced" brand energy the homepage is built around.
const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// Manrope — warm geometric body sans, distinct from the generic Inter/Arial
// defaults, still highly legible at small sizes.
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

/**
 * Search-result and link-preview copy. Leads with the strongest specific offer
 * (a real "from" price, DBS-checked, pay-later) rather than a generic tagline,
 * and uses the LIVE pricing from Settings so it never goes stale.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { hourlyRate, minHours, depositPercentage } = await getPricing();
  const from = Math.round(hourlyRate * minHours * 100) / 100;
  const title = "House Cleaning in Barking, Dagenham & Romford | Ample Cleaners";
  const description = `Local house, deep, end of tenancy, office and after builders cleaning across Barking, Dagenham, Romford, Ilford and Hornchurch. DBS-checked cleaners. See your exact price instantly — regular cleaning from £${from} (${minHours} hours at £${hourlyRate}/hr). Pay just ${depositPercentage}% to book, the rest after the clean. Free changes up to 48 hours before.`;
  return {
    title: { default: title, template: "%s | Ample Cleaners" },
    description,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    robots: { index: true, follow: true },
    openGraph: { type: "website", siteName: "Ample Cleaners", locale: "en_GB", title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: "Ample Cleaners",
    description: "DBS-checked regular, deep, end of tenancy, office and after-builders cleaning with fixed prices across Barking, Dagenham, Romford and east London.",
    url: site,
    areaServed: AREAS.map((a) => ({ "@type": "Place", name: a.name })),
    priceRange: "££",
  };

  return (
    <html lang="en" className={cn(unbounded.variable, manrope.variable)}>
      <body className="font-sans antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {children}
        <Toaster richColors position="top-right" />
        <Analytics />
      </body>
    </html>
  );
}
