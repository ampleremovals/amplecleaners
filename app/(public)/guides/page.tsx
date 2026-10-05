import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/lib/seo/guides";

const title = "Cleaning Guides & Checklists | Ample Cleaners";
const description = "Free, practical cleaning guides and printable checklists: end of tenancy, deposit rules, deep cleaning, ovens, bathrooms, offices and after builders.";
export const metadata: Metadata = { title: { absolute: title }, description, alternates: { canonical: "/guides" }, openGraph: { title, description, url: "/guides" } };

export default function GuidesIndex() {
  return (
    <div className="bg-gradient-to-br from-brand-green-50 via-white to-brand-sky-50 px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="font-display text-3xl font-extrabold text-brand-green-950 sm:text-4xl">Cleaning guides and checklists</h1>
        <p className="mt-4 text-lg text-slate-700">Practical, no-nonsense advice from the Ample Cleaners team. Share any guide with a friend, a flatmate or your landlord, or print a checklist.</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {GUIDES.map((g) => (
            <li key={g.slug} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Link href={`/guides/${g.slug}`} className="font-display text-lg font-extrabold text-brand-green-900 hover:underline">{g.title}</Link>
              <p className="mt-2 text-sm text-slate-700">{g.summary}</p>
              <p className="mt-3 text-xs font-semibold text-slate-600">{g.minutes} min read{g.printable ? " · Printable checklist" : ""}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
