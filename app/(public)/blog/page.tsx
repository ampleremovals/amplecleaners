import type { Metadata } from "next";
import Link from "next/link";
import { CategoryNav, PostList } from "@/components/seo/PostList";
import { POSTS } from "@/lib/seo/posts";

const title = "Cleaning News & Tips | Ample Cleaners";
const description = "Seasonal cleaning tips, advice for tenants, landlords and offices, and news from Ample Cleaners across Barking, Dagenham, Romford and Ilford.";
export const metadata: Metadata = {
  title: { absolute: title }, description, alternates: { canonical: "/blog", types: { "application/rss+xml": "/blog/feed.xml" } },
  openGraph: { title, description, url: "/blog" },
};

export default function BlogIndex() {
  return (
    <div className="bg-gradient-to-br from-brand-green-50 via-white to-brand-sky-50 px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-display text-3xl font-extrabold text-brand-green-950 sm:text-4xl">Cleaning news and tips</h1>
        <p className="mt-4 text-lg text-slate-700">Timely advice and updates from the Ample Cleaners team. Looking for step-by-step how-tos and checklists? See our <Link href="/guides" className="font-semibold text-brand-green-800 hover:underline">cleaning guides</Link>.</p>
        <CategoryNav />
        <PostList posts={POSTS} />
        <p className="mt-8 text-sm text-slate-600"><a href="/blog/feed.xml" className="font-semibold text-brand-green-800 hover:underline">Subscribe via RSS</a></p>
      </div>
    </div>
  );
}
