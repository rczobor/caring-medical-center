/**
 * A meta description from a page's own copy: its opening paragraphs as plain text,
 * cut at a word boundary to fit search results (~155 characters). A short opening
 * line ("A teljesítmény fejben kezdődik.") is joined with the paragraphs after it.
 * Headings, lists, images and lone links ("Időpontfoglalás") are skipped. Falls back
 * when the copy has no paragraph, e.g. a page that opens with a list.
 */
export function describe(markdown: string, fallback: string, max = 155): string {
  const paragraphs = markdown
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p && !/^(#{1,6}|-|\*|\d+\.)\s|^!\[|^\[[^\]]*\]\([^)]*\)$/.test(p))
    .map((p) =>
      p
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[*_`]/g, '')
        .replace(/\s+/g, ' '),
    );
  let text = '';
  for (const p of paragraphs) {
    text = text ? `${text} ${p}` : p;
    if (text.length >= 100) break;
  }
  if (!text) return fallback;
  if (text.length <= max) return text;
  return `${text.slice(0, text.lastIndexOf(' ', max - 1))}…`;
}
