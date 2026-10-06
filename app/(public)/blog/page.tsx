import type { Metadata } from "next";
import Link from "next/link";
import { CategoryNav, PostList } from "@/components/seo/PostList";
import { PageBody, PageHero } from "@/components/shared/PageHero";
import { POSTS } from "@/lib/seo/posts";

const title = "Cleaning News & Tips | Ample Cleaners";
const description = "Seasonal cleaning tips, advice for tenants, landlords and offices, and news from Ample Cleaners across Barking, Dagenham, Romford and Ilford.";
export const metadata: Metadata = {
  title: { absolute: title }, description, alternates: { canonical: "/blog", types: { "application/rss+xml": "/blog/feed.xml" } },
  openGraph: { title, description, url: "/blog" },
};

export default function BlogIndex() {
  return (
    <>
      <PageHero
        width="narrow"
        crumbs={[{ label: "Home", href: "/" }, { label: "News & tips" }]}
        title="Cleaning news and tips"
        lead={<>Timely advice and updates from the Ample Cleaners team. Looking for step-by-step how-tos and checklists? See our <Link href="/guides" className="font-semibold text-white underline underline-offset-2">cleaning guides</Link>.</>}
      />
      <PageBody width="narrow">
        <CategoryNav />
        <PostList posts={POSTS} />
        <p className="mt-10 text-sm text-slate-600"><a href="/blog/feed.xml" className="font-semibold text-brand-green-700 hover:underline">Subscribe via RSS</a></p>
      </PageBody>
    </>
  );
}
