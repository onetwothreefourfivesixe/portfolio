// Inline links in content.json copy, written the Markdown way: [label](https://example.com).
// The text is split into plain and link segments so components render real <a> elements
// and never inject HTML from the copy.

export interface Segment {
  text: string;
  href?: string;
  /** Opens in a new tab (web links); mailto: and site-relative links stay in this tab. */
  external?: boolean;
}

// [label](url); the url may hold one level of parentheses, e.g. a Wikipedia title.
const LINK = /\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;
// Only these kinds of url become links; anything else is left as typed.
const ALLOWED = /^(https?:\/\/|mailto:|\/)/i;

export function parseLinks(src: string): Segment[] {
  const out: Segment[] = [];
  const push = (text: string) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && !last.href) last.text += text;
    else out.push({ text });
  };
  let at = 0;
  for (const m of src.matchAll(LINK)) {
    push(src.slice(at, m.index));
    const [whole, label, url] = m;
    if (ALLOWED.test(url)) out.push({ text: label, href: url, external: /^https?:/i.test(url) });
    else push(whole);
    at = m.index + whole.length;
  }
  push(src.slice(at));
  return out;
}
