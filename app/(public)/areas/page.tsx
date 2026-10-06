import type { Metadata } from "next";
import Link from "next/link";
import { AREAS, AREA_GROUPS } from "@/lib/seo/areas";
import { SPECIALIST_SERVICES } from "@/lib/seo/services";
import { H2, PageBody, PageHero } from "@/components/shared/PageHero";

const title = "Areas We Cover | Cleaning Services Across East London | Ample Cleaners";
const description = "House, deep, end of tenancy, office and after builders cleaning in Barking, Dagenham, Romford, Hornchurch, Ilford and 45 more east London and Essex border areas.";
export const metadata: Metadata = { title: { absolute: title }, description, alternates: { canonical: "/areas" }, openGraph: { title, description, url: "/areas" } };

export default function AreasPage() {
  return (
    <>
      <PageHero
        width="wide"
        crumbs={[{ label: "Home", href: "/" }, { label: "Areas we cover" }]}
        title="Areas we cover"
        lead={`Ample Cleaners works across ${AREAS.length} areas of east London and the Essex border. Find your area for local information and a fixed price on every service.`}
      />
      <PageBody width="wide">
        <div className="space-y-14">
          {AREA_GROUPS.map((group) => (
            <section key={group}>
              <H2>{group}</H2>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {AREAS.filter((a) => a.group === group).map((a) => (
                  <li key={a.slug} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-brand-green-300">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <Link href={`/cleaning-services/${a.slug}`} className="font-display text-base font-bold text-slate-900 hover:text-brand-green-800 hover:underline">{a.name}</Link>
                      <span className="text-xs font-semibold text-slate-500">{a.postcodes.join(", ")}</span>
                    </div>
                    <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-sm">
                      {SPECIALIST_SERVICES.map((s) => <Link key={s.slug} href={`/${s.slug}/${a.slug}`} className="font-medium text-slate-600 hover:text-brand-green-800 hover:underline">{s.name}</Link>)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="rounded-3xl bg-slate-50 p-6 text-slate-700">
            Not sure we cover you? <Link href="/booking/regular_cleaning" className="font-semibold text-brand-green-700 hover:underline">Enter your postcode when you book</Link> and we will confirm.
          </p>
        </div>
      </PageBody>
    </>
  );
}
