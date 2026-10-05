import type { Metadata } from "next";
import Link from "next/link";
import { AREAS, AREA_GROUPS } from "@/lib/seo/areas";
import { SPECIALIST_SERVICES } from "@/lib/seo/services";

const title = "Areas We Cover | Cleaning Services Across East London | Ample Cleaners";
const description = "House, deep, end of tenancy, office and after builders cleaning in Barking, Dagenham, Romford, Hornchurch, Ilford and 45 more east London and Essex border areas.";
export const metadata: Metadata = { title: { absolute: title }, description, alternates: { canonical: "/areas" }, openGraph: { title, description, url: "/areas" } };

export default function AreasPage() {
  return (
    <div className="bg-gradient-to-br from-brand-green-50 via-white to-brand-sky-50 px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="font-display text-3xl font-extrabold text-brand-green-950 sm:text-4xl">Areas we cover</h1>
        <p className="mt-4 text-lg text-slate-700">Ample Cleaners works across {AREAS.length} areas of east London and the Essex border. Find your area for local information and a fixed price on every service.</p>
        {AREA_GROUPS.map((group) => (
          <section key={group} className="mt-10">
            <h2 className="font-display text-2xl font-extrabold text-brand-green-950">{group}</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {AREAS.filter((a) => a.group === group).map((a) => (
                <li key={a.slug} className="rounded-xl border border-slate-200 bg-white p-4">
                  <Link href={`/cleaning-services/${a.slug}`} className="font-bold text-brand-green-900 hover:underline">{a.name}</Link>
                  <span className="ml-2 text-xs font-semibold text-slate-600">{a.postcodes.join(", ")}</span>
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                    {SPECIALIST_SERVICES.map((s) => <Link key={s.slug} href={`/${s.slug}/${a.slug}`} className="text-slate-700 hover:text-brand-green-800 hover:underline">{s.name}</Link>)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="mt-10 text-slate-700">Not sure we cover you? <Link href="/booking/regular_cleaning" className="font-semibold text-brand-green-800 hover:underline">Enter your postcode when you book</Link> and we will confirm.</p>
      </div>
    </div>
  );
}
