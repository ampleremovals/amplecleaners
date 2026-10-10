/** Pure helpers for reading received emails (no database, so they are unit-tested directly). */

export function parseAddress(raw: string): { name: string | null; email: string } {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(raw);
  const email = (m ? m[2] : raw).trim().toLowerCase();
  const name = m?.[1]?.trim() || null;
  return { name, email };
}

/** True for out-of-office replies, bounces, newsletters and other machine mail (which must not pause follow-ups). */
export function isAutoReply(p: { from: string; subject?: string | null; headers?: Record<string, unknown> | null }): boolean {
  const h: Record<string, string> = {};
  for (const [k, v] of Object.entries(p.headers ?? {})) h[k.toLowerCase()] = String(v ?? "").toLowerCase();
  if (h["auto-submitted"] && h["auto-submitted"] !== "no") return true;
  if (h["x-autoreply"] || h["x-autorespond"] || h["x-auto-response-suppress"]) return true;
  if (["bulk", "junk", "auto_reply", "list"].includes(h["precedence"] ?? "")) return true;
  if (/^(mailer-daemon|postmaster|no-?reply|do-?not-?reply)@/i.test(p.from)) return true;
  return /^(automatic reply|auto(matic)?[- ]?reply|out of (the )?office|undeliverable|delivery (status|failure)|mail delivery)/i.test((p.subject ?? "").trim());
}

export const htmlToText = (html: string) =>
  html.replace(/<(style|script)[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n").trim();

/** Drops the quoted history so the Inbox shows only what the customer just wrote. */
export function stripQuotedReply(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const cut = lines.findIndex((l, i) => /^on .+ wrote:\s*$/i.test(l.trim()) || (/^on .+/i.test(l.trim()) && /wrote:\s*$/i.test(lines[i + 1]?.trim() ?? "")) || /^-{2,}\s*original message\s*-{2,}/i.test(l.trim()) || /^from:\s.+/i.test(l.trim()) && /^sent:/i.test(lines[i + 1]?.trim() ?? ""));
  const kept = (cut >= 0 ? lines.slice(0, cut) : lines).filter((l) => !/^>/.test(l.trim()));
  return kept.join("\n").trim() || text.trim();
}

