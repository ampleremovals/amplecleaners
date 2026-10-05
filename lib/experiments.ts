/**
 * A/B testing without storing anything on the visitor's device.
 *
 * The variant is a STABLE hash of IP + User-Agent computed on the fly in
 * middleware (never stored), so the same visitor keeps seeing the same version
 * without a cookie or localStorage — which also means no consent banner is
 * needed. Pure functions only (runs in the Edge runtime too).
 */

export type Variant = "a" | "b";
export const VARIANTS: Variant[] = ["a", "b"];
/** Bump when you start a NEW test so everyone is re-split (and old data stays separate). */
export const EXPERIMENT_ID = "hero-2026-10";

const BOT_PATTERN = /bot|crawl|spider|slurp|lighthouse|headless|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|axios|node-fetch|go-http|pingdom|uptime|monitor/i;

export function isBot(userAgent: string | null | undefined): boolean {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

/** cyrb53 — small, fast, well-distributed non-cryptographic hash (fine for a 50/50 split). */
export function hash53(input: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Variant for this visitor. Bots and unknown clients always get the control (A) so they never skew results. */
export function variantFor(ip: string | null | undefined, userAgent: string | null | undefined): Variant {
  if (isBot(userAgent) || !ip) return "a";
  return hash53(`${EXPERIMENT_ID}|${ip}|${userAgent}`) % 2 === 0 ? "a" : "b";
}

/** Variant implied by the (post-rewrite) path a page was served from. */
export function variantFromPath(path: string): Variant | null {
  if (path === "/") return "a";
  if (path === "/lp/b") return "b";
  return null;
}
