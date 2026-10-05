import type { Metadata } from "next";

/** The booking form is a conversion step with no unique content: keep it out of search results (links on it are still followed). */
export const metadata: Metadata = { title: "Get your price", robots: { index: false, follow: true } };

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
