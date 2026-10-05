import type { PricingConfig } from "@/lib/pricing";
import { regularCleaningPrice } from "@/lib/pricing";
import { nearbyAreas, type Area, type AreaTag } from "@/lib/seo/areas";
import { checklistFor, type SeoService } from "@/lib/seo/services";

export interface PageContent {
  title: string;
  description: string;
  h1: string;
  lead: string;
  paragraphs: string[];
  checklist: { area: string; items: string[] }[];
  priceNote: string;
  faqs: { q: string; a: string }[];
}

/** Stable small number from a string, so wording variants are deterministic per page. */
function pick(seed: string, n: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % n;
}

const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 0 }).format(n);

/** First of the area's tags that this service has a specific angle for. */
function angleFor(service: SeoService, area: Area): string {
  for (const tag of area.tags as AreaTag[]) {
    const a = service.angles[tag];
    if (a) return a;
  }
  return service.angleDefault;
}

/** Title patterns rotate per page so titles are distinct in form as well as in the place name. */
function titleFor(service: SeoService, area: Area): string {
  const patterns = [
    `${service.name} in ${area.name} | Ample Cleaners`,
    `${service.name} ${area.name} ${area.postcodes[0]} | Ample Cleaners`,
    `${area.name} ${service.name} | Fixed Prices | Ample Cleaners`,
  ];
  return patterns[pick(`${service.slug}:${area.slug}`, patterns.length)];
}

function descriptionFor(service: SeoService, area: Area, pricing: PricingConfig): string {
  const price = service.slug === "house-cleaning" || service.slug === "cleaning-services"
    ? ` House cleaning from ${gbp(regularCleaningPrice(pricing.minHours, pricing))}.`
    : " Fixed price, no obligation.";
  const d = `${service.name} in ${area.name} (${area.postcodes.join(", ")}). ${service.promise}${price}`;
  return d.length > 158 ? `${d.slice(0, 155).trimEnd()}...` : d;
}

export function buildPage(service: SeoService, area: Area, pricing: PricingConfig): PageContent {
  const near = nearbyAreas(area).slice(0, 3).map((a) => a.name);
  const nearText = near.length ? `, and we also cover ${near.slice(0, -1).join(", ")}${near.length > 1 ? " and " : ""}${near[near.length - 1]}` : "";
  const fromPrice = gbp(regularCleaningPrice(pricing.minHours, pricing));
  const isRegular = service.slug === "house-cleaning" || service.slug === "cleaning-services";

  const lead = `${service.promise} We cover ${area.name} (${area.postcodes.join(", ")})${nearText}.`;

  const seed = `${service.slug}:${area.slug}`;
  const trust = [
    "Every clean is done by DBS-checked cleaners, we are fully insured, and you can change or cancel free up to 48 hours before.",
    "You get DBS-checked cleaners, full insurance cover, and free changes or cancellation up to 48 hours before your clean.",
    "Our cleaners are DBS-checked, we are fully insured, and changing or cancelling is free up to 48 hours ahead.",
  ][pick(seed + "t", 3)];
  const scope = [
    `What does it involve? Our ${service.noun} covers ${service.covers}`,
    `Here is what a visit looks like: our ${service.noun} covers ${service.covers}`,
    `Our ${service.noun} service covers ${service.covers}`,
  ][pick(seed + "s", 3)];
  const reach = near.length
    ? `Looking for ${service.noun} near ${area.name} (${area.postcodes.join(", ")})? We also cover ${near.join(", ")}, so you can book whichever address suits you.`
    : "";

  const paragraphs = [
    `${area.about} ${area.homes} ${angleFor(service, area)}${area.station ? ` ${area.station}` : ""}`,
    `${area.tip} ${service.audience}`,
    `${scope} ${service.process}`,
    reach,
    trust,
  ].filter(Boolean);

  const priceNote = isRegular
    ? `House cleaning in ${area.name} is ${gbp(pricing.hourlyRate)} an hour with a ${pricing.minHours}-hour minimum, so from ${fromPrice}. You see your exact total before you book.`
    : `${service.name} in ${area.name} is priced to the job. Tell us about the property and you will get a fixed price with no obligation.`;

  const faqs = [
    ...service.faqs.map((f) => ({ q: f.q.replaceAll("{area}", area.name), a: f.a.replaceAll("{area}", area.name) })),
    { q: `Which postcodes do you cover around ${area.name}?`, a: `${area.name} falls within ${area.postcodes.join(", ")}${near.length ? `, and we also cover nearby areas including ${near.join(", ")}` : ""}. Enter your postcode when you book and we will confirm we can reach you.` },
  ];

  return {
    title: titleFor(service, area),
    description: descriptionFor(service, area, pricing),
    h1: `${service.name} in ${area.name}`,
    lead,
    paragraphs,
    checklist: checklistFor(service),
    priceNote,
    faqs,
  };
}

/** Hub page for one service across every area. */
export function hubDescription(service: SeoService): string {
  const d = `${service.name} across Barking, Dagenham, Romford, Hornchurch, Ilford and surrounding areas. ${service.promise}`;
  return d.length > 158 ? `${d.slice(0, 155).trimEnd()}...` : d;
}
