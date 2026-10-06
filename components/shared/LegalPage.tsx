import type { ReactNode } from "react";
import { PageBody, PageHero } from "@/components/shared/PageHero";

/** Shared shell for the legal pages: readable column, clear headings, last-updated line. */
export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro: string; children: ReactNode }) {
  return (
    <>
      <PageHero width="narrow" title={title} lead={intro}>
        <p className="text-sm text-brand-green-100">Last updated {updated}</p>
      </PageHero>
      <PageBody width="narrow">
        <article className="space-y-10 text-[16px] leading-[1.75] text-slate-700 [&_a]:font-semibold [&_a]:text-brand-green-700 [&_a:hover]:underline [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-[1.25rem] [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_li]:marker:text-brand-green-600 [&_strong]:text-slate-900 [&_ul]:mt-3 [&_ul]:space-y-2">
          {children}
        </article>
      </PageBody>
    </>
  );
}
