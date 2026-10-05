import type { Metadata } from "next";
import Link from "next/link";
import { GuideBrowser, type GuideCard } from "@/components/seo/GuideBrowser";
import { GUIDES } from "@/lib/seo/guides";
import type { SeoServiceSlug } from "@/lib/seo/services";

const title = "Cleaning Guides & Checklists | Ample Cleaners";
const description = "Free, practical cleaning guides and printable checklists: end of tenancy, deposit rules, deep cleaning, ovens, bathrooms, offices and after builders.";
export const metadata: Metadata = { title: { absolute: title }, description, alternates: { canonical: "/guides" }, openGraph: { title, description, url: "/guides" } };

/** Reader-friendly topic for each guide, derived from the service it leads to. */
const TOPIC_BY_SERVICE: Record<SeoServiceSlug, string> = {
  "house-cleaning": "Everyday home cleaning",
  "deep-cleaning": "Deep cleaning and appliances",
  "end-of-tenancy-cleaning": "Renting, moving and deposits",
  "office-cleaning": "Offices and workplaces",
  "after-builders-cleaning": "After building work",
  "cleaning-services": "Choosing a cleaner",
};
const TOPICS = Object.values(TOPIC_BY_SERVICE);

export default function GuidesIndex() {
  const cards: GuideCard[] = GUIDES.map((g) => ({ slug: g.slug, title: g.title, summary: g.summary, minutes: g.minutes, printable: !!g.printable, topic: TOPIC_BY_SERVICE[g.service] }));
  return (
    <div className="bg-gradient-to-br from-brand-green-50 via-white to-brand-sky-50 px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="font-display text-3xl font-extrabold text-brand-green-950 sm:text-4xl">Cleaning guides and checklists</h1>
        <p className="mt-4 text-lg text-slate-700">Practical, no-nonsense advice from the Ample Cleaners team. Share any guide with a friend, a flatmate or your landlord, or print a checklist. Looking for seasonal tips and company news? See our <Link href="/blog" className="font-semibold text-brand-green-800 hover:underline">news &amp; tips</Link>.</p>
        <div className="mt-6"><GuideBrowser guides={cards} topics={TOPICS} /></div>
      </div>
    </div>
  );
}
