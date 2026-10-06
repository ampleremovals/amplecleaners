import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { POST_CATEGORIES, POSTS, type Post, type PostCategory } from "@/lib/seo/posts";

export const ukDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** Category pills: "All" plus each category that has posts. */
export function CategoryNav({ active }: { active?: PostCategory }) {
  const cats = (Object.keys(POST_CATEGORIES) as PostCategory[]).filter((c) => POSTS.some((p) => p.category === c));
  const pill = "rounded-full border px-4 py-2 text-sm font-semibold transition-colors";
  const on = "border-brand-green-700 bg-brand-green-700 text-white";
  const off = "border-slate-200 bg-white text-slate-800 hover:border-brand-green-400 hover:bg-brand-green-50";
  return (
    <nav aria-label="Blog categories" className="flex flex-wrap gap-2">
      <Link href="/blog" aria-current={!active ? "page" : undefined} className={`${pill} ${!active ? on : off}`}>All</Link>
      {cats.map((c) => (
        <Link key={c} href={`/blog/category/${c}`} aria-current={active === c ? "page" : undefined} className={`${pill} ${active === c ? on : off}`}>{POST_CATEGORIES[c].name}</Link>
      ))}
    </nav>
  );
}

export function PostList({ posts }: { posts: Post[] }) {
  return (
    <ul className="mt-8 space-y-4">
      {posts.map((p) => (
        <li key={p.slug} className="group relative rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-green-300 hover:shadow-lg">
          <p className="text-xs font-semibold text-slate-500">{POST_CATEGORIES[p.category].name} · {ukDate(p.published)} · {p.minutes} min read</p>
          <Link href={`/blog/${p.slug}`} className="mt-2 block font-display text-[1.05rem] font-bold leading-snug text-slate-900 after:absolute after:inset-0 after:content-[''] group-hover:text-brand-green-800">{p.title}</Link>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{p.summary}</p>
          <p className="mt-4 flex items-center gap-1.5 text-sm font-bold text-brand-green-700">Read more <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></p>
        </li>
      ))}
    </ul>
  );
}
