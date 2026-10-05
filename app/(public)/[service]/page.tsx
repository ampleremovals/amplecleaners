import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubPage } from "@/components/seo/LocalPage";
import { hubDescription } from "@/lib/seo/content";
import { SEO_SERVICES, getSeoService } from "@/lib/seo/services";

export const dynamicParams = false;

type Params = { service: string };

export function generateStaticParams(): Params[] {
  return SEO_SERVICES.map((s) => ({ service: s.slug }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const service = getSeoService(params.service);
  if (!service) return {};
  const title = `${service.name} in Barking, Dagenham & Romford | Ample Cleaners`;
  return { title: { absolute: title }, description: hubDescription(service), alternates: { canonical: `/${service.slug}` }, openGraph: { title, description: hubDescription(service), url: `/${service.slug}` } };
}

export default function ServiceHub({ params }: { params: Params }) {
  const service = getSeoService(params.service);
  if (!service) notFound();
  return <HubPage service={service} intro={service.promise} />;
}
