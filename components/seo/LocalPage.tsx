import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { COMPANY_NAME } from "@/lib/constants";
import { AREAS, nearbyAreas, type Area } from "@/lib/seo/areas";
import { SEO_SERVICES, SPECIALIST_SERVICES, type SeoService } from "@/lib/seo/services";
import type { PageContent } from "@/lib/seo/content";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com";

/** Where the call-to-action sends people. utm_content records which area page produced the booking. */
export const bookingHref = (service: SeoService, areaSlug?: string) =>
  `/booking/${service.type}?utm_source=seo${areaSlug ? `&utm_content=area-${areaSlug}` : ""}`;

const pagePath = (service: SeoService, area?: Area) => (area ? `/${service.slug}/${area.slug}` : `/${service.slug}`);

function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

function Cta({ service, area, label }: { service: SeoService; area?: Area; label?: string }) {
  return (
    <Link href={bookingHref(service, area?.slug)} className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-green-700 px-6 text-base font-bold text-white shadow-lg shadow-brand-green-200 hover:bg-brand-green-800">
      {label ?? service.cta}
    </Link>
  );
}

/** One service in one area. */
export function LocalPage({ service, area, content }: { service: SeoService; area: Area; content: PageContent }) {
  const url = `${SITE}${pagePath(service, area)}`;
  const near = nearbyAreas(area);
  const otherServices = SEO_SERVICES.filter((s) => s.slug !== service.slug);

  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "Service", name: `${service.name} in ${area.name}`, serviceType: service.name,
      description: content.description, url,
      provider: { "@type": "HomeAndConstructionBusiness", name: COMPANY_NAME, url: SITE },
      areaServed: { "@type": "Place", name: area.name },
    },
    {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: content.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: service.name, item: `${SITE}${pagePath(service)}` },
        { "@type": "ListItem", position: 3, name: area.name, item: url },
      ],
    },
  ];

  return (
    <div className="bg-gradient-to-br from-brand-green-50 via-white to-brand-sky-50 px-4 py-10 sm:py-14">
      {jsonLd.map((d, i) => <JsonLd key={i} data={d} />)}
      <div className="mx-auto w-full max-w-4xl space-y-10">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
          <Link href="/" className="hover:underline">Home</Link> / <Link href={pagePath(service)} className="hover:underline">{service.name}</Link> / <span className="font-semibold text-slate-800">{area.name}</span>
        </nav>

        <header>
          <h1 className="font-display text-3xl font-extrabold text-brand-green-950 sm:text-4xl">{content.h1}</h1>
          <p className="mt-4 text-lg text-slate-700">{content.lead}</p>
          <div className="mt-6"><Cta service={service} area={area} /></div>
          <p className="mt-3 text-sm font-semibold text-slate-700">{content.priceNote}</p>
        </header>

        <section className="space-y-4 text-slate-700">
          {content.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </section>

        <section>
          <h2 className="font-display text-2xl font-extrabold text-brand-green-950">What our {service.noun} covers in {area.name}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {content.checklist.map((g) => (
              <div key={g.area} className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-bold text-slate-900">{g.area}</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                  {g.items.map((item) => (
                    <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green-700" aria-hidden />{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl font-extrabold text-brand-green-950">Questions about {service.noun} in {area.name}</h2>
          <div className="mt-4 space-y-3">
            {content.faqs.map((f) => (
              <details key={f.q} className="rounded-xl border border-slate-200 bg-white p-4">
                <summary className="cursor-pointer font-semibold text-slate-900">{f.q}</summary>
                <p className="mt-2 text-slate-700">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-6"><Cta service={service} area={area} /></div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="font-display text-xl font-extrabold text-brand-green-950">Other cleaning services in {area.name}</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {otherServices.map((s) => <li key={s.slug}><Link className="font-semibold text-brand-green-800 hover:underline" href={pagePath(s, area)}>{s.name} in {area.name}</Link></li>)}
            </ul>
          </div>
          {near.length > 0 && (
            <div>
              <h2 className="font-display text-xl font-extrabold text-brand-green-950">{service.name} near {area.name}</h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {near.map((a) => <li key={a.slug}><Link className="font-semibold text-brand-green-800 hover:underline" href={pagePath(service, a)}>{service.name} in {a.name}</Link></li>)}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/** One service across every area. */
export function HubPage({ service, intro }: { service: SeoService; intro: string }) {
  const jsonLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: service.name, item: `${SITE}${pagePath(service)}` },
    ],
  };
  const groups = [...new Set(AREAS.map((a) => a.group))];
  return (
    <div className="bg-gradient-to-br from-brand-green-50 via-white to-brand-sky-50 px-4 py-10 sm:py-14">
      <JsonLd data={jsonLd} />
      <div className="mx-auto w-full max-w-4xl space-y-10">
        <header>
          <h1 className="font-display text-3xl font-extrabold text-brand-green-950 sm:text-4xl">{service.name} in Barking, Dagenham, Romford and surrounding areas</h1>
          <p className="mt-4 text-lg text-slate-700">{intro}</p>
          <p className="mt-3 text-slate-700">Our {service.noun} covers {service.covers}</p>
          <p className="mt-3 text-slate-700">{service.audience} {service.process}</p>
          <div className="mt-6"><Cta service={service} /></div>
        </header>
        <section>
          <h2 className="font-display text-2xl font-extrabold text-brand-green-950">Common questions about {service.noun}</h2>
          <div className="mt-4 space-y-3">
            {service.faqs.map((f) => (
              <details key={f.q} className="rounded-xl border border-slate-200 bg-white p-4">
                <summary className="cursor-pointer font-semibold text-slate-900">{f.q.replaceAll("{area}", "my area")}</summary>
                <p className="mt-2 text-slate-700">{f.a.replaceAll("{area}", "your area")}</p>
              </details>
            ))}
          </div>
        </section>
        {groups.map((g) => (
          <section key={g}>
            <h2 className="font-display text-xl font-extrabold text-brand-green-950">{g}</h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
              {AREAS.filter((a) => a.group === g).map((a) => (
                <li key={a.slug}><Link className="font-semibold text-brand-green-800 hover:underline" href={pagePath(service, a)}>{service.name} in {a.name}</Link></li>
              ))}
            </ul>
          </section>
        ))}
        <section>
          <h2 className="font-display text-xl font-extrabold text-brand-green-950">Our other services</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {SPECIALIST_SERVICES.filter((s) => s.slug !== service.slug).map((s) => <li key={s.slug}><Link className="font-semibold text-brand-green-800 hover:underline" href={pagePath(s)}>{s.name}</Link></li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}
