import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="en" className={cn(outfit.variable, inter.variable)}>
      <body className="font-sans antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
