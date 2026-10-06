import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ukDate } from "@/components/seo/PostList";
import { ShareBar } from "@/components/seo/ShareBar";
import { ARTICLE_BODY, ARTICLE_H2 } from "@/components/seo/article-styles";
import { CtaBand, PageBody, PageHero } from "@/components/shared/PageHero";
import { COMPANY_NAME } from "@/lib/constants";
import { getGuide } from "@/lib/seo/guides";
import { POSTS, POST_CATEGORIES, getPost } from "@/lib/seo/posts";

export const dynamicParams = false;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com";
type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const p = getPost(params.slug);
  if (!p) return {};
  const path = `/blog/${p.slug}`;
  return {
    title: { absolute: `${p.title} | Ample Cleaners` }, description: p.description, alternates: { canonical: path },
    openGraph: { type: "article", title: p.title, description: p.description, url: path, publishedTime: p.published },
  };
}

export default function PostPage({ params }: { params: Params }) {
  const p = getPost(params.slug);
  if (!p) notFound();
  const path = `/blog/${p.slug}`;
  const cat = POST_CATEGORIES[p.category];
  const guides = p.relatedGuides.flatMap((s) => { const g = getGuide(s); return g ? [g] : []; });

  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: p.description,
      datePublished: p.published, dateModified: p.published, mainEntityOfPage: `${SITE}${path}`, articleSection: cat.name,
      author: { "@type": "Organization", name: COMPANY_NAME, url: SITE }, publisher: { "@type": "Organization", name: COMPANY_NAME, url: SITE },
    },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "News & tips", item: `${SITE}/blog` },
      { "@type": "ListItem", position: 3, name: p.title, item: `${SITE}${path}` },
    ] },
  ];

  return (
    <>
      {jsonLd.map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }} />)}
      <PageHero
        width="narrow"
        crumbs={[{ label: "Home", href: "/" }, { label: "News & tips", href: "/blog" }, { label: cat.name, href: `/blog/category/${p.category}` }]}
        title={p.title}
        lead={p.intro}
      >
        <p className="text-sm text-brand-green-100">By the {COMPANY_NAME} team · {ukDate(p.published)} · {p.minutes} min read</p>
      </PageHero>

      <PageBody width="narrow">
        <article>
          <ShareBar title={p.title} path={path} />

          <div className={`mt-10 ${ARTICLE_BODY}`}>
            {p.sections.map((s) => (
              <section key={s.h}>
                <h2 className={ARTICLE_H2}>{s.h}</h2>
                {s.p?.map((t, i) => <p key={i} className="mt-3">{t}</p>)}
                {s.ul && <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-brand-green-600">{s.ul.map((x) => <li key={x}>{x}</li>)}</ul>}
                {s.ol && <ol className="mt-3 list-decimal space-y-2 pl-5 marker:font-semibold marker:text-brand-green-700">{s.ol.map((x) => <li key={x}>{x}</li>)}</ol>}
              </section>
            ))}
          </div>

          {guides.length > 0 && (
            <section className="mt-14">
              <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">Read next</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {guides.map((g) => (
                  <li key={g.slug}>
                    <Link href={`/guides/${g.slug}`} className="group flex h-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-[15px] font-semibold text-slate-800 transition-colors hover:border-brand-green-300 hover:text-brand-green-800">
                      {g.title}<ArrowRight className="h-4 w-4 shrink-0 text-brand-green-700 transition-transform group-hover:translate-x-1" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-14">
            <CtaBand
              title="Need a hand?"
              text={`${COMPANY_NAME} cleans homes and offices across Barking, Dagenham, Romford, Ilford and surrounding areas, with DBS-checked cleaners and a fixed price.`}
              href="/cleaning-services"
              label="See our cleaning services"
            />
          </div>
          <div className="mt-10"><ShareBar title={p.title} path={path} /></div>
        </article>
      </PageBody>
    </>
  );
}
