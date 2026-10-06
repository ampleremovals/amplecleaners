import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryNav, PostList } from "@/components/seo/PostList";
import { PageBody, PageHero } from "@/components/shared/PageHero";
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
    <>
      <PageHero
        width="narrow"
        crumbs={[{ label: "Home", href: "/" }, { label: "News & tips", href: "/blog" }, { label: cat.name }]}
        title={cat.name}
        lead={cat.blurb}
      />
      <PageBody width="narrow">
        <CategoryNav active={category} />
        <PostList posts={postsIn(category)} />
      </PageBody>
    </>
  );
}
