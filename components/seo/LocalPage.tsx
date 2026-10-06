import { CheckCircle2, ChevronDown } from "lucide-react";
import { COMPANY_NAME } from "@/lib/constants";
import { AREAS, nearbyAreas, type Area } from "@/lib/seo/areas";
import { SEO_SERVICES, SPECIALIST_SERVICES, type SeoService } from "@/lib/seo/services";
import type { PageContent } from "@/lib/seo/content";
import { Chip, CtaBand, H2, HeroButton, PageBody, PageHero } from "@/components/shared/PageHero";
import { BookCard, StickyBookBar } from "@/components/seo/BookCard";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com";

/** Where the call-to-action sends people. utm_content records which area page produced the booking. */
export const bookingHref = (service: SeoService, areaSlug?: string) =>
  `/booking/${service.type}?utm_source=seo${areaSlug ? `&utm_content=area-${areaSlug}` : ""}`;

const pagePath = (service: SeoService, area?: Area) => (area ? `/${service.slug}/${area.slug}` : `/${service.slug}`);

function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

const FAQ_CLASS = "group rounded-2xl border border-slate-200 bg-white px-5 py-4 transition-shadow open:border-brand-green-300 open:shadow-md";
const FAQ_SUMMARY = "flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[0.95rem] font-bold leading-snug text-slate-900 [&::-webkit-details-marker]:hidden";

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className={FAQ_CLASS}>
      <summary className={FAQ_SUMMARY}>{q}<ChevronDown className="h-5 w-5 shrink-0 text-brand-green-700 transition-transform group-open:rotate-180" aria-hidden /></summary>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{children}</p>
    </details>
  );
}

/** One service in one area. */
export function LocalPage({ service, area, content }: { service: SeoService; area: Area; content: PageContent }) {
  const url = `${SITE}${pagePath(service, area)}`;
  const near = nearbyAreas(area);
  const otherServices = SEO_SERVICES.filter((s) => s.slug !== service.slug);
  const href = bookingHref(service, area.slug);

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
    <>
      {jsonLd.map((d, i) => <JsonLd key={i} data={d} />)}
      <PageHero
        width="wide"
        crumbs={[{ label: "Home", href: "/" }, { label: service.name, href: pagePath(service) }, { label: area.name }]}
        title={content.h1}
        lead={content.lead}
      >
        <HeroButton href={href}>{service.cta}</HeroButton>
        <p className="mt-3.5 max-w-xl text-sm text-brand-green-100">{content.priceNote}</p>
      </PageHero>

      <PageBody width="wide">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
          <div className="min-w-0 space-y-14">
            <section className="space-y-5 text-[16.5px] leading-[1.75] text-slate-700">
              {content.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </section>

            <section>
              <H2>What our {service.noun} covers in {area.name}</H2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {content.checklist.map((g) => (
                  <div key={g.area} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="font-display text-base font-bold text-slate-900">{g.area}</h3>
                    <ul className="mt-3 space-y-2 text-[15px] text-slate-700">
                      {g.items.map((item) => (
                        <li key={item} className="flex gap-2.5"><CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brand-green-700" aria-hidden />{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <H2>Questions about {service.noun} in {area.name}</H2>
              <div className="mt-6 space-y-3">
                {content.faqs.map((f) => <Faq key={f.q} q={f.q}>{f.a}</Faq>)}
              </div>
            </section>

            <CtaBand
              title={`Ready to book in ${area.name}?`}
              text="See your exact price in about 2 minutes. No card needed, and you can change or cancel free up to 48 hours before."
              href={href}
              label={service.cta}
            />

            <section className="grid gap-10 sm:grid-cols-2">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">Other cleaning services in {area.name}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {otherServices.map((s) => <Chip key={s.slug} href={pagePath(s, area)}>{s.name} in {area.name}</Chip>)}
                </div>
              </div>
              {near.length > 0 && (
                <div>
                  <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">{service.name} near {area.name}</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {near.map((a) => <Chip key={a.slug} href={pagePath(service, a)}>{service.name} in {a.name}</Chip>)}
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-28"><BookCard href={href} serviceType={service.type} place={area.name} label={service.cta} /></div>
          </div>
        </div>
      </PageBody>
      <StickyBookBar href={href} serviceType={service.type} label="See my price" />
    </>
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
  const href = bookingHref(service);
  return (
    <>
      <JsonLd data={jsonLd} />
      <PageHero
        width="wide"
        crumbs={[{ label: "Home", href: "/" }, { label: service.name }]}
        title={`${service.name} in Barking, Dagenham, Romford and surrounding areas`}
        lead={intro}
      >
        <HeroButton href={href}>{service.cta}</HeroButton>
      </PageHero>

      <PageBody width="wide">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
          <div className="min-w-0 space-y-14">
            <section className="space-y-5 text-[16.5px] leading-[1.75] text-slate-700">
              <p>Our {service.noun} covers {service.covers}</p>
              <p>{service.audience} {service.process}</p>
            </section>

            <section>
              <H2>Common questions about {service.noun}</H2>
              <div className="mt-6 space-y-3">
                {service.faqs.map((f) => <Faq key={f.q} q={f.q.replaceAll("{area}", "my area")}>{f.a.replaceAll("{area}", "your area")}</Faq>)}
              </div>
            </section>

            <section>
              <H2>Find {service.noun} in your area</H2>
              <div className="mt-6 space-y-8">
                {groups.map((g) => (
                  <div key={g}>
                    <h3 className="font-display text-base font-bold text-slate-900">{g}</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {AREAS.filter((a) => a.group === g).map((a) => <Chip key={a.slug} href={pagePath(service, a)}>{service.name} in {a.name}</Chip>)}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <CtaBand title={`Book ${service.noun} today`} text="See your exact price in about 2 minutes. No card needed, and free changes up to 48 hours before." href={href} label={service.cta} />

            <section>
              <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">Our other services</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {SPECIALIST_SERVICES.filter((s) => s.slug !== service.slug).map((s) => <Chip key={s.slug} href={pagePath(s)}>{s.name}</Chip>)}
              </div>
            </section>
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-28"><BookCard href={href} serviceType={service.type} place="east London" label={service.cta} /></div>
          </div>
        </div>
      </PageBody>
      <StickyBookBar href={href} serviceType={service.type} label="See my price" />
    </>
  );
}
