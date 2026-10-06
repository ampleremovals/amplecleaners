"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Printer, Search } from "lucide-react";

export interface GuideCard { slug: string; title: string; summary: string; minutes: number; printable: boolean; topic: string }

/** Guides grouped by topic, with a search box that filters by title and summary. */
export function GuideBrowser({ guides, topics }: { guides: GuideCard[]; topics: string[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = useMemo(() => (q ? guides.filter((g) => `${g.title} ${g.summary}`.toLowerCase().includes(q)) : guides), [guides, q]);

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Search guides</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search guides, e.g. oven, deposit, mould"
          className="h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-base shadow-sm outline-none transition focus:border-brand-green-600 focus:ring-4 focus:ring-brand-green-100"
        />
      </label>
      <p className="mt-3 text-sm text-slate-600" aria-live="polite">{matches.length} {matches.length === 1 ? "guide" : "guides"}{q ? ` matching "${query.trim()}"` : ""}</p>

      {matches.length === 0 && <p className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">No guides match that search. Try a shorter word, or clear the box to see everything.</p>}

      {topics.map((topic) => {
        const inTopic = matches.filter((g) => g.topic === topic);
        if (inTopic.length === 0) return null;
        return (
          <section key={topic} className="mt-12" aria-labelledby={`topic-${topic}`}>
            <h2 id={`topic-${topic}`} className="font-display text-[1.4rem] font-bold tracking-tight text-slate-900 sm:text-[1.65rem]">{topic}</h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {inTopic.map((g) => (
                <li key={g.slug} className="group relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-green-300 hover:shadow-lg">
                  <Link href={`/guides/${g.slug}`} className="font-display text-[1.02rem] font-bold leading-snug text-slate-900 after:absolute after:inset-0 after:content-[''] group-hover:text-brand-green-800">{g.title}</Link>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{g.summary}</p>
                  <p className="mt-4 flex items-center gap-3 text-xs font-semibold text-slate-500">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{g.minutes} min read</span>
                    {g.printable && <span className="inline-flex items-center gap-1"><Printer className="h-3.5 w-3.5" aria-hidden />Printable checklist</span>}
                    <ArrowRight className="ml-auto h-4 w-4 text-brand-green-700 transition-transform group-hover:translate-x-1" aria-hidden />
                  </p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
