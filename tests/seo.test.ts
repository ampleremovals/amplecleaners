import { test } from "node:test";
import assert from "node:assert/strict";
import { AREAS, nearbyAreas } from "../lib/seo/areas";
import { SEO_SERVICES } from "../lib/seo/services";
import { buildPage } from "../lib/seo/content";
import { DEFAULT_PRICING } from "../lib/pricing";

test("area data integrity", () => {
  assert.ok(AREAS.length >= 50, `expected 50+ areas, got ${AREAS.length}`);
  const slugs = new Set(AREAS.map((a) => a.slug));
  assert.equal(slugs.size, AREAS.length, "duplicate slug");
  for (const a of AREAS) {
    assert.match(a.slug, /^[a-z]+(-[a-z]+)*$/);
    assert.ok(a.postcodes.length > 0);
    for (const p of a.postcodes) assert.match(p, /^[A-Z]{1,2}\d{1,2}$/);
    for (const n of a.nearby) assert.ok(slugs.has(n), `${a.slug} links to unknown ${n}`);
    assert.ok(!a.nearby.includes(a.slug), `${a.slug} links to itself`);
    assert.ok(nearbyAreas(a).length >= 3, `${a.slug} needs 3+ nearby areas`);
  }
});

test("every page has a unique title, h1 and description", () => {
  const titles = new Set<string>(), h1s = new Set<string>(), descs = new Set<string>();
  for (const s of SEO_SERVICES) for (const a of AREAS) {
    const p = buildPage(s, a, DEFAULT_PRICING);
    titles.add(p.title); h1s.add(p.h1); descs.add(p.description);
    assert.ok(p.description.length <= 160);
  }
  const n = SEO_SERVICES.length * AREAS.length;
  assert.equal(titles.size, n); assert.equal(h1s.size, n); assert.equal(descs.size, n);
});

/** Word-shingle Jaccard similarity of the body text. */
const shingles = (t: string) => { const w = t.toLowerCase().split(/\W+/).filter(Boolean); const s = new Set<string>(); for (let i = 0; i + 4 <= w.length; i++) s.add(w.slice(i, i + 4).join(" ")); return s; };
const sim = (a: Set<string>, b: Set<string>) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };
const body = (s: (typeof SEO_SERVICES)[number], a: (typeof AREAS)[number]) => { const p = buildPage(s, a, DEFAULT_PRICING); return [p.lead, ...p.paragraphs].join(" "); };

test("same-service pages in different areas stay meaningfully different", () => {
  for (const s of SEO_SERVICES) {
    const docs = AREAS.map((a) => shingles(body(s, a)));
    let worst = 0;
    for (let i = 0; i < docs.length; i++) for (let j = i + 1; j < docs.length; j++) worst = Math.max(worst, sim(docs[i], docs[j]));
    assert.ok(worst < 0.6, `${s.slug}: worst similarity ${worst.toFixed(2)}`);
  }
});

test("no invented claims on pages", () => {
  for (const s of SEO_SERVICES) for (const a of AREAS) {
    const p = buildPage(s, a, DEFAULT_PRICING);
    const text = JSON.stringify(p).toLowerCase();
    assert.ok(!/(5-star|rated|reviews|years of experience|guarantee[ds]? (to )?rank)/.test(text), `${s.slug}/${a.slug}`);
  }
});
