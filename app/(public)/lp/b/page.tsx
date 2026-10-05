import type { Metadata } from "next";
import { HomeView } from "@/components/home/HomeView";

// Test variant: served at "/" by the middleware rewrite; never indexed on its own URL.
export const metadata: Metadata = { robots: { index: false, follow: false }, alternates: { canonical: "/" } };

export default function HomeVariantB() {
  return <HomeView variant="b" />;
}
