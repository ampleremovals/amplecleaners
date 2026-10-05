import type { Metadata } from "next";

/** The staff sign-in must never appear in search results (robots.txt also disallows /admin). */
export const metadata: Metadata = { title: "Staff sign in", robots: { index: false, follow: false } };

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
