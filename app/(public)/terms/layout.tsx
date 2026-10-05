import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms & Conditions", description: "The terms that apply when you book a clean with Ample Cleaners — prices, deposits, changes and cancellations." };

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
