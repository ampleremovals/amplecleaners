import type { Guide, GuideSection } from "@/lib/seo/guides";
import type { SeoServiceSlug } from "@/lib/seo/services";

/** Compact builders so large batches of guides stay readable. */
export const para = (h: string, ...p: string[]): GuideSection => ({ h, p });
export const bullets = (h: string, ul: string[]): GuideSection => ({ h, ul });
export const steps = (h: string, ol: string[]): GuideSection => ({ h, ol });

interface GuideInput {
  slug: string;
  title: string;
  description: string;
  summary: string;
  minutes: number;
  service: SeoServiceSlug;
  intro: string;
  sections: GuideSection[];
  /** One question and answer, [q, a]. */
  faq: [string, string];
  printable?: boolean;
}

export const guide = (g: GuideInput): Guide => ({
  slug: g.slug, title: g.title, description: g.description, summary: g.summary,
  published: "2026-10-05", minutes: g.minutes, service: g.service, intro: g.intro,
  sections: g.sections, faqs: [{ q: g.faq[0], a: g.faq[1] }], printable: g.printable,
});
