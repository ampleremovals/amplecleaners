import type { ReactNode } from "react";

/** Shared shell for the legal pages: readable column, clear headings, last-updated line. */
export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro: string; children: ReactNode }) {
  return (
    <div className="bg-gradient-to-br from-brand-green-50 via-white to-brand-sky-50 px-4 py-12 sm:py-16">
      <article className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-10">
        <h1 className="font-display text-3xl font-extrabold text-brand-green-950">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {updated}</p>
        <p className="mt-5 text-slate-600">{intro}</p>
        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-slate-700 [&_a]:font-semibold [&_a]:text-brand-green-700 [&_a:hover]:underline [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-brand-green-950 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:mt-2 [&_ul]:space-y-1.5">
          {children}
        </div>
      </article>
    </div>
  );
}
