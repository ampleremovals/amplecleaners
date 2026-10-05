import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryNav, PostList } from "@/components/seo/PostList";
import { POSTS, POST_CATEGORIES, postsIn, type PostCategory } from "@/lib/seo/posts";

export const dynamicParams = false;

type Params = { category: string };
const activeCategories = () => (Object.keys(POST_CATEGORIES) as PostCategory[]).filter((c) => POSTS.some((p) => p.category === c));

export function generateStaticParams(): Params[] {
  return activeCategories().map((category) => ({ category }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const cat = POST_CATEGORIES[params.category as PostCategory];
  if (!cat) return {};
  const title = `${cat.name} | Cleaning News & Tips | Ample Cleaners`;
  return { title: { absolute: title }, description: `${cat.blurb} From the Ample Cleaners team.`, alternates: { canonical: `/blog/category/${params.category}` } };
}

export default function CategoryPage({ params }: { params: Params }) {
  const category = params.category as PostCategory;
  const cat = POST_CATEGORIES[category];
  if (!cat || !activeCategories().includes(category)) notFound();
  return (
    <div className="bg-gradient-to-br from-brand-green-50 via-white to-brand-sky-50 px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-display text-3xl font-extrabold text-brand-green-950 sm:text-4xl">{cat.name}</h1>
        <p className="mt-4 text-lg text-slate-700">{cat.blurb}</p>
        <CategoryNav active={category} />
        <PostList posts={postsIn(category)} />
      </div>
    </div>
  );
}
