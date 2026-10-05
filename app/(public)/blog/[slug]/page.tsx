import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ukDate } from "@/components/seo/PostList";
import { ShareBar } from "@/components/seo/ShareBar";
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
    <div className="bg-gradient-to-br from-brand-green-50 via-white to-brand-sky-50 px-4 py-10 sm:py-14">
      {jsonLd.map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }} />)}
      <article className="mx-auto w-full max-w-3xl">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-600"><Link href="/" className="hover:underline">Home</Link> / <Link href="/blog" className="hover:underline">News & tips</Link> / <Link href={`/blog/category/${p.category}`} className="hover:underline">{cat.name}</Link></nav>
        <h1 className="mt-4 font-display text-3xl font-extrabold text-brand-green-950 sm:text-4xl">{p.title}</h1>
        <p className="mt-2 text-sm text-slate-600">By the {COMPANY_NAME} team · {ukDate(p.published)} · {p.minutes} min read</p>
        <p className="mt-5 text-lg text-slate-700">{p.intro}</p>
        <div className="mt-5"><ShareBar title={p.title} path={path} /></div>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-slate-700">
          {p.sections.map((s) => (
            <section key={s.h}>
              <h2 className="font-display text-xl font-extrabold text-brand-green-950">{s.h}</h2>
              {s.p?.map((t, i) => <p key={i} className="mt-2">{t}</p>)}
              {s.ul && <ul className="mt-2 list-disc space-y-1.5 pl-5">{s.ul.map((x) => <li key={x}>{x}</li>)}</ul>}
              {s.ol && <ol className="mt-2 list-decimal space-y-1.5 pl-5">{s.ol.map((x) => <li key={x}>{x}</li>)}</ol>}
            </section>
          ))}
        </div>

        {guides.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl font-extrabold text-brand-green-950">Read next</h2>
            <ul className="mt-3 space-y-1.5 text-sm">{guides.map((g) => <li key={g.slug}><Link href={`/guides/${g.slug}`} className="font-semibold text-brand-green-800 hover:underline">{g.title}</Link></li>)}</ul>
          </section>
        )}

        <aside className="mt-10 rounded-2xl bg-brand-green-950 p-6 text-white">
          <p className="font-display text-lg font-extrabold">Need a hand?</p>
          <p className="mt-2 text-slate-200">{COMPANY_NAME} cleans homes and offices across Barking, Dagenham, Romford, Ilford and surrounding areas, with DBS-checked cleaners and a fixed price.</p>
          <Link href="/cleaning-services" className="mt-4 inline-flex h-11 items-center rounded-xl bg-white px-5 font-bold text-brand-green-900 hover:bg-slate-100">See our cleaning services</Link>
        </aside>
        <div className="mt-8"><ShareBar title={p.title} path={path} /></div>
      </article>
    </div>
  );
}
