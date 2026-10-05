import Link from "next/link";
import { AREAS, AREA_GROUPS } from "@/lib/seo/areas";
import { SPECIALIST_SERVICES } from "@/lib/seo/services";

/** Crawlable "where we work" block for the homepage: real links to every service hub and every area page. */
export function AreasSection() {
  return (
    <section id="areas" className="px-4 py-14 sm:py-20" aria-labelledby="areas-heading">
      <div className="container max-w-5xl">
        <h2 id="areas-heading" className="font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">Cleaners in Barking, Dagenham, Romford and across east London</h2>
        <p className="mt-3 text-slate-700">Find your area for local prices and services: house cleaning, deep cleaning, end of tenancy, office and after builders cleaning.</p>
        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
          {SPECIALIST_SERVICES.map((s) => <li key={s.slug}><Link href={`/${s.slug}`} className="text-brand-green-800 hover:underline">{s.name}</Link></li>)}
        </ul>
        <p className="mt-4 text-sm"><Link href="/areas" className="font-bold text-brand-green-800 hover:underline">See every area and service</Link></p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {AREA_GROUPS.map((g) => (
            <div key={g}>
              <h3 className="font-bold text-slate-900">{g}</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {AREAS.filter((a) => a.group === g).map((a) => <li key={a.slug}><Link href={`/cleaning-services/${a.slug}`} className="text-slate-700 hover:text-brand-green-800 hover:underline">Cleaning services in {a.name}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
