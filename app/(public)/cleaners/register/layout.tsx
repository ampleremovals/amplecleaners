import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Cleaner | Join Ample Cleaners",
  description: "Apply to clean with Ample Cleaners across Barking, Dagenham, Romford, Ilford and surrounding areas. Flexible hours and a simple application.",
  alternates: { canonical: "/cleaners/register" },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
