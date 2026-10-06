import type { Metadata } from "next";
import Link from "next/link";
import { GuideBrowser, type GuideCard } from "@/components/seo/GuideBrowser";
import { PageBody, PageHero } from "@/components/shared/PageHero";
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
    <>
      <PageHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Guides" }]}
        title="Cleaning guides and checklists"
        lead={<>Practical, no-nonsense advice from the Ample Cleaners team. Share any guide with a friend, a flatmate or your landlord, or print a checklist. Looking for seasonal tips and company news? See our <Link href="/blog" className="font-semibold text-white underline underline-offset-2">news &amp; tips</Link>.</>}
      />
      <PageBody>
        <GuideBrowser guides={cards} topics={TOPICS} />
      </PageBody>
    </>
  );
}
