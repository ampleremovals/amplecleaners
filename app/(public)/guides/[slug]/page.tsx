import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronDown } from "lucide-react";
import { ShareBar } from "@/components/seo/ShareBar";
import { ARTICLE_BODY, ARTICLE_H2 } from "@/components/seo/article-styles";
import { CtaBand, PageBody, PageHero } from "@/components/shared/PageHero";
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
    <>
      {jsonLd.map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }} />)}
      <PageHero
        width="narrow"
        crumbs={[{ label: "Home", href: "/" }, { label: "Guides", href: "/guides" }, { label: g.title }]}
        title={g.title}
        lead={g.intro}
      >
        <p className="text-sm text-brand-green-100">By the {COMPANY_NAME} team · {ukDate(g.published)} · {g.minutes} min read</p>
      </PageHero>

      <PageBody width="narrow">
        <article>
          <ShareBar title={g.title} path={path} printable={g.printable} />

          <div className={`mt-10 ${ARTICLE_BODY}`}>
            {g.sections.map((s) => (
              <section key={s.h}>
                <h2 className={ARTICLE_H2}>{s.h}</h2>
                {s.p?.map((p, i) => <p key={i} className="mt-3">{p}</p>)}
                {s.ul && <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-brand-green-600">{s.ul.map((x) => <li key={x}>{x}</li>)}</ul>}
                {s.ol && <ol className="mt-3 list-decimal space-y-2 pl-5 marker:font-semibold marker:text-brand-green-700">{s.ol.map((x) => <li key={x}>{x}</li>)}</ol>}
              </section>
            ))}
          </div>

          <section className="mt-14">
            <h2 className={ARTICLE_H2}>Common questions</h2>
            <div className="mt-5 space-y-3">
              {g.faqs.map((f) => (
                <details key={f.q} className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 open:border-brand-green-300" open>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[0.95rem] font-bold leading-snug text-slate-900 [&::-webkit-details-marker]:hidden">
                    {f.q}<ChevronDown className="h-5 w-5 shrink-0 text-brand-green-700 transition-transform group-open:rotate-180 print:hidden" aria-hidden />
                  </summary>
                  <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          {service && (
            <div className="mt-14">
              <CtaBand
                title="Would you rather we did it for you?"
                text={`${COMPANY_NAME} offers ${service.noun} across Barking, Dagenham, Romford, Ilford and surrounding areas, with DBS-checked cleaners and a fixed price.`}
                href={`/${service.slug}`}
                label={`See ${service.name.toLowerCase()} near you`}
              />
            </div>
          )}

          <div className="mt-10"><ShareBar title={g.title} path={path} printable={g.printable} /></div>

          <section className="mt-14 print:hidden">
            <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">More guides</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={`/guides/${r.slug}`} className="group flex h-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-[15px] font-semibold text-slate-800 transition-colors hover:border-brand-green-300 hover:text-brand-green-800">
                    {r.title}<ArrowRight className="h-4 w-4 shrink-0 text-brand-green-700 transition-transform group-hover:translate-x-1" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </article>
      </PageBody>
    </>
  );
}
