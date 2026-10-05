import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShareBar } from "@/components/seo/ShareBar";
import { COMPANY_NAME } from "@/lib/constants";
import { GUIDES, getGuide } from "@/lib/seo/guides";
import { getSeoService } from "@/lib/seo/services";

export const dynamicParams = false;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com";
type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const g = getGuide(params.slug);
  if (!g) return {};
  const path = `/guides/${g.slug}`;
  return {
    title: { absolute: `${g.title} | Ample Cleaners` }, description: g.description, alternates: { canonical: path },
    openGraph: { type: "article", title: g.title, description: g.description, url: path, publishedTime: g.published },
  };
}

const ukDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default function GuidePage({ params }: { params: Params }) {
  const g = getGuide(params.slug);
  if (!g) notFound();
  const service = getSeoService(g.service);
  const path = `/guides/${g.slug}`;
  // Same-service guides first, so the links are topically relevant.
  const related = GUIDES.filter((x) => x.slug !== g.slug).sort((x, y) => Number(y.service === g.service) - Number(x.service === g.service)).slice(0, 4);

  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.description,
      datePublished: g.published, dateModified: g.published, mainEntityOfPage: `${SITE}${path}`,
      author: { "@type": "Organization", name: COMPANY_NAME, url: SITE }, publisher: { "@type": "Organization", name: COMPANY_NAME, url: SITE },
    },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: g.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE}/guides` },
      { "@type": "ListItem", position: 3, name: g.title, item: `${SITE}${path}` },
    ] },
  ];

  return (
    <div className="bg-gradient-to-br from-brand-green-50 via-white to-brand-sky-50 px-4 py-10 sm:py-14 print:bg-white print:py-0">
      {jsonLd.map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }} />)}
      <article className="mx-auto w-full max-w-3xl">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-600 print:hidden"><Link href="/" className="hover:underline">Home</Link> / <Link href="/guides" className="hover:underline">Guides</Link></nav>
        <h1 className="mt-4 font-display text-3xl font-extrabold text-brand-green-950 sm:text-4xl">{g.title}</h1>
        <p className="mt-2 text-sm text-slate-600">By the {COMPANY_NAME} team · {ukDate(g.published)} · {g.minutes} min read</p>
        <p className="mt-5 text-lg text-slate-700">{g.intro}</p>
        <div className="mt-5"><ShareBar title={g.title} path={path} printable={g.printable} /></div>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-slate-700">
          {g.sections.map((s) => (
            <section key={s.h}>
              <h2 className="font-display text-xl font-extrabold text-brand-green-950">{s.h}</h2>
              {s.p?.map((p, i) => <p key={i} className="mt-2">{p}</p>)}
              {s.ul && <ul className="mt-2 list-disc space-y-1.5 pl-5">{s.ul.map((x) => <li key={x}>{x}</li>)}</ul>}
              {s.ol && <ol className="mt-2 list-decimal space-y-1.5 pl-5">{s.ol.map((x) => <li key={x}>{x}</li>)}</ol>}
            </section>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="font-display text-xl font-extrabold text-brand-green-950">Common questions</h2>
          <div className="mt-3 space-y-3">
            {g.faqs.map((f) => (
              <details key={f.q} className="rounded-xl border border-slate-200 bg-white p-4" open>
                <summary className="cursor-pointer font-semibold text-slate-900">{f.q}</summary>
                <p className="mt-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {service && (
          <aside className="mt-10 rounded-2xl bg-brand-green-950 p-6 text-white print:hidden">
            <p className="font-display text-lg font-extrabold">Would you rather we did it for you?</p>
            <p className="mt-2 text-slate-200">{COMPANY_NAME} offers {service.noun} across Barking, Dagenham, Romford, Ilford and surrounding areas, with DBS-checked cleaners and a fixed price.</p>
            <Link href={`/${service.slug}`} className="mt-4 inline-flex h-11 items-center rounded-xl bg-white px-5 font-bold text-brand-green-900 hover:bg-slate-100">See {service.name.toLowerCase()} near you</Link>
          </aside>
        )}

        <div className="mt-8"><ShareBar title={g.title} path={path} printable={g.printable} /></div>

        <section className="mt-10 print:hidden">
          <h2 className="font-display text-xl font-extrabold text-brand-green-950">More guides</h2>
          <ul className="mt-3 space-y-1.5 text-sm">{related.map((r) => <li key={r.slug}><Link href={`/guides/${r.slug}`} className="font-semibold text-brand-green-800 hover:underline">{r.title}</Link></li>)}</ul>
        </section>
      </article>
    </div>
  );
}
