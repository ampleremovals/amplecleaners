/**
 * Template text → safe email HTML.
 *
 * Templates are written in a tiny markup so the owner never edits raw HTML:
 *   blank line = new paragraph · "- item" lines = bullet list · **bold** · [link text](https://…)
 * and `{{variable}}` placeholders. Everything is HTML-escaped; links only allow http(s)/mailto/tel.
 */

const P_STYLE = "margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155;";
const LI_STYLE = "margin:0 0 6px;font-size:15px;line-height:1.6;color:#334155;";
const A_STYLE = "color:#15803d;font-weight:bold;text-decoration:underline;";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Variable names that carry a ready-made URL: inserted untouched. Everything else is stripped of markup characters. */
const isUrlVar = (name: string) => /(Link|Url)$/.test(name);

export function findVariables(text: string): string[] {
  return [...new Set([...text.matchAll(/\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/g)].map((m) => m[1]))];
}

/** Replaces `{{name}}`. Unknown or empty variables become "" (reported by `findVariables` in the admin preview). */
export function interpolate(text: string, vars: Record<string, string | number | null | undefined>): string {
  return text.replace(/\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/g, (_, name: string) => {
    const v = vars[name];
    if (v == null) return "";
    const s = String(v);
    // A customer's name must never be able to inject markup or a link into the email.
    return isUrlVar(name) ? s : s.replace(/[*[\]<>]/g, "");
  });
}

function inline(line: string): string {
  const parts: string[] = [];
  let rest = line;
  const link = /\[([^\]]+)\]\(([^)\s]+)\)/;
  for (let m = link.exec(rest); m; m = link.exec(rest)) {
    parts.push(boldOnly(rest.slice(0, m.index)));
    const href = m[2];
    parts.push(/^(https?:\/\/|mailto:|tel:)/i.test(href) ? `<a href="${escapeHtml(href)}" style="${A_STYLE}">${boldOnly(m[1])}</a>` : boldOnly(m[1]));
    rest = rest.slice(m.index + m[0].length);
  }
  parts.push(boldOnly(rest));
  return parts.join("");
}

function boldOnly(s: string): string {
  return escapeHtml(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

/** Converts already-interpolated template text to email HTML. */
export function markupToHtml(text: string): string {
  const blocks = text.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trimEnd()).filter(Boolean);
      if (lines.length && lines.every((l) => /^[-•]\s+/.test(l))) {
        return `<ul style="margin:0 0 14px;padding-left:20px;">${lines.map((l) => `<li style="${LI_STYLE}">${inline(l.replace(/^[-•]\s+/, ""))}</li>`).join("")}</ul>`;
      }
      return `<p style="${P_STYLE}">${lines.map(inline).join("<br>")}</p>`;
    })
    .join("");
}

/** Plain-text twin of an email (better deliverability, and what some clients show). */
export function markupToText(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1: $2");
}
