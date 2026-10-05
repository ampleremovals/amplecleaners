"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface GuideCard { slug: string; title: string; summary: string; minutes: number; printable: boolean; topic: string }

/** Guides grouped by topic, with a search box that filters by title and summary. */
export function GuideBrowser({ guides, topics }: { guides: GuideCard[]; topics: string[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = useMemo(() => (q ? guides.filter((g) => `${g.title} ${g.summary}`.toLowerCase().includes(q)) : guides), [guides, q]);

  return (
    <div>
      <label className="block">
        <span className="sr-only">Search guides</span>
        <input
          type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search guides, e.g. oven, deposit, mould"
          className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base outline-none focus:border-brand-green-600"
        />
      </label>
      <p className="mt-2 text-sm text-slate-600" aria-live="polite">{matches.length} {matches.length === 1 ? "guide" : "guides"}{q ? ` matching "${query.trim()}"` : ""}</p>

      {matches.length === 0 && <p className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-slate-700">No guides match that search. Try a shorter word, or clear the box to see everything.</p>}

      {topics.map((topic) => {
        const inTopic = matches.filter((g) => g.topic === topic);
        if (inTopic.length === 0) return null;
        return (
          <section key={topic} className="mt-10" aria-labelledby={`topic-${topic}`}>
            <h2 id={`topic-${topic}`} className="font-display text-2xl font-extrabold text-brand-green-950">{topic}</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {inTopic.map((g) => (
                <li key={g.slug} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <Link href={`/guides/${g.slug}`} className="font-display text-lg font-extrabold text-brand-green-900 hover:underline">{g.title}</Link>
                  <p className="mt-2 text-sm text-slate-700">{g.summary}</p>
                  <p className="mt-3 text-xs font-semibold text-slate-600">{g.minutes} min read{g.printable ? " · Printable checklist" : ""}</p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
