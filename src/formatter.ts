/**
 * Source-agnostic formatter: raw chord text -> a ```chords block body.
 *
 * See docs/ULTIMATE-GUITAR.md for the conversion algorithm.
 *
 * IMPORTANT: chord alignment is POSITIONAL. We only delete literal markup
 * markers (which never change inter-token spacing) and re-bracket headers — we
 * never trim, pad, or reflow chord/lyric lines.
 */

const SECTION_KW_SRC =
  "(?:intro|verses?|chorus|pre[\\s-]?chorus|prechorus|bridge|coda|outro|tag|interlude|refrain|ending|instrumental|vamp|hook)";
const SECTION_KW = new RegExp("^" + SECTION_KW_SRC, "i");
const HEADER_WITH_CHORDS = new RegExp(
  "^(\\s*)(" + SECTION_KW_SRC + "(?:\\s*\\d+)?)(\\s+)(\\S.*)$",
  "i"
);
const CHORD_TOKEN = /^[A-G][#b]?(m|maj|min|sus|add|aug|dim|sus2|sus4|maj7|m7)?\d*(\/[A-G][#b]?)?$/;

function isChords(text: string): boolean {
  const toks = text.trim().split(/\s+/).filter(Boolean);
  return toks.length > 0 && toks.every((t) => CHORD_TOKEN.test(t));
}

/** Like isChords but tolerates trailing qualifiers in parentheses, e.g. "Dmaj7 E (2x)". */
function isChordish(text: string): boolean {
  return isChords(text.replace(/\([^)]*\)/g, "").trim());
}

/** "VERSE 1" / "pre-chorus" / "PRE CHORUS" / "Chorus2" -> "Verse 1" / "Pre-Chorus" / "Pre Chorus" / "Chorus 2". */
function normLabel(label: string): string {
  const titleWord = (w: string) =>
    w
      .split("-")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join("-");
  const spaced = label
    .trim()
    .replace(/([A-Za-z])(\d)/g, "$1 $2") // split letter/number runs: "Chorus2" -> "Chorus 2"
    .replace(/^pre[\s-]?chorus/i, "Pre-Chorus"); // canonicalize to the vault's hyphenated form
  return spaced
    .split(/\s+/)
    .map(titleWord) // title-case every word, not just the first
    .join(" ");
}

/**
 * If `line` is a section header, return its normalized bracketed form (possibly
 * split across two lines when chords share the header line). Returns null if the
 * line is not a header.
 */
export function normalizeHeaderLine(line: string): string | null {
  const lead = line.slice(0, line.length - line.trimStart().length);
  const core = line.trim();
  if (!core || core.startsWith("[") || !SECTION_KW.test(core)) return null;

  if (core.includes(":")) {
    const idx = core.indexOf(":");
    const label = core.slice(0, idx).trim();
    const tail = core.slice(idx + 1).trim();
    if (tail && isChords(tail)) return `${lead}[${normLabel(label)}]\n${lead}${tail}`;
    return `${lead}[${normLabel(core.replace(/:+\s*$/, "").trim())}]`;
  }

  const m = line.match(HEADER_WITH_CHORDS);
  if (m && isChordish(m[4])) return `${m[1]}[${normLabel(m[2].trim())}]\n${m[1]}${m[4]}`;

  return `${lead}[${normLabel(core.replace(/[\s-]+$/, "").trim())}]`;
}

/** Convert raw site content (with [ch]/[tab] markup) into the ```chords block body. */
export function formatChordBlock(rawContent: string): string {
  const stripped = rawContent
    .replace(/\r\n?/g, "\n")
    .replace(/\[\/?tab\]/g, "")
    .replace(/\[\/?ch\]/g, "");

  const out: string[] = [];
  for (const line of stripped.split("\n")) {
    const fixed = normalizeHeaderLine(line);
    if (fixed !== null && fixed !== line) out.push(...fixed.split("\n"));
    else out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Wrap a block body in a fenced ```chords block (leading blank line matches the
 * template). The fence is made longer than the longest backtick run in the body
 * so untrusted content can't close the block early and inject Markdown/HTML.
 */
export function wrapChordsFence(body: string): string {
  const runs: string[] = body.match(/`+/g) ?? [];
  const longestRun = runs.reduce((m, r) => Math.max(m, r.length), 0);
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}chords\n\n${body}\n${fence}`;
}
