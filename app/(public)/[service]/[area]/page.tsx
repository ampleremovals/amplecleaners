import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalPage } from "@/components/seo/LocalPage";
import { getPricing } from "@/lib/pricing-config";
import { AREAS, getArea } from "@/lib/seo/areas";
import { buildPage } from "@/lib/seo/content";
import { SEO_SERVICES, getSeoService } from "@/lib/seo/services";

export const revalidate = 3600;
export const dynamicParams = false;

type Params = { service: string; area: string };

/** Every service × area page is built at deploy time. */
export function generateStaticParams(): Params[] {
  return SEO_SERVICES.flatMap((s) => AREAS.map((a) => ({ service: s.slug, area: a.slug })));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const service = getSeoService(params.service);
  const area = getArea(params.area);
  if (!service || !area) return {};
  const content = buildPage(service, area, await getPricing());
  const canonical = `/${service.slug}/${area.slug}`;
  return {
    title: { absolute: content.title },
    description: content.description,
    alternates: { canonical },
    openGraph: { title: content.title, description: content.description, url: canonical },
  };
}

export default async function LocalServicePage({ params }: { params: Params }) {
  const service = getSeoService(params.service);
  const area = getArea(params.area);
  if (!service || !area) notFound();
  return <LocalPage service={service} area={area} content={buildPage(service, area, await getPricing())} />;
}
