import Link from "next/link";
import { POST_CATEGORIES, POSTS, type Post, type PostCategory } from "@/lib/seo/posts";

export const ukDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** Category pills: "All" plus each category that has posts. */
export function CategoryNav({ active }: { active?: PostCategory }) {
  const cats = (Object.keys(POST_CATEGORIES) as PostCategory[]).filter((c) => POSTS.some((p) => p.category === c));
  const pill = "rounded-full border px-3.5 py-1.5 text-sm font-semibold";
  return (
    <nav aria-label="Blog categories" className="mt-6 flex flex-wrap gap-2">
      <Link href="/blog" className={`${pill} ${!active ? "border-brand-green-700 bg-brand-green-700 text-white" : "border-slate-200 bg-white text-slate-800 hover:border-brand-green-400"}`}>All</Link>
      {cats.map((c) => (
        <Link key={c} href={`/blog/category/${c}`} className={`${pill} ${active === c ? "border-brand-green-700 bg-brand-green-700 text-white" : "border-slate-200 bg-white text-slate-800 hover:border-brand-green-400"}`}>{POST_CATEGORIES[c].name}</Link>
      ))}
    </nav>
  );
}

export function PostList({ posts }: { posts: Post[] }) {
  return (
    <ul className="mt-8 space-y-4">
      {posts.map((p) => (
        <li key={p.slug} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-600">{POST_CATEGORIES[p.category].name} · {ukDate(p.published)} · {p.minutes} min read</p>
          <Link href={`/blog/${p.slug}`} className="mt-1 block font-display text-lg font-extrabold text-brand-green-900 hover:underline">{p.title}</Link>
          <p className="mt-2 text-sm text-slate-700">{p.summary}</p>
        </li>
      ))}
    </ul>
  );
}
