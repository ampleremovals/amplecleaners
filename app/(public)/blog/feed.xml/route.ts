import { POSTS } from "@/lib/seo/posts";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** RSS 2.0 feed of the blog, newest first. */
export function GET(): Response {
  const items = POSTS.map((p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.published).toUTCString()}</pubDate>
      <description>${esc(p.description)}</description>
    </item>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Ample Cleaners: Cleaning News &amp; Tips</title>
    <link>${SITE}/blog</link>
    <description>Cleaning tips and news from Ample Cleaners across east London.</description>
    <language>en-gb</language>
${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
