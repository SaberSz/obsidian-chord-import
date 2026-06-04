import { SongMetadata } from "./types";

/**
 * Parses content captured by a page clipper (e.g. Obsidian Web Clipper on
 * iPad/iPhone) into the same { metadata, rawContent } shape an adapter returns,
 * so it feeds the same source-agnostic formatter. This is the mobile path: where
 * the desktop webview can't run, the user clips the page in Safari (already past
 * any bot check) and we parse the clip.
 *
 * A clip looks like: YAML frontmatter (with a "title" like "Artist - Song
 * (Chords)"), a short metadata list, then the chord chart inside a fenced code
 * block. Clippers sometimes sweep in ad/video-player JavaScript — we strip that.
 *
 * Pure module (no Obsidian/DOM deps) so the junk-stripping is unit-testable.
 */

const PAREN_KIND =
  /\s*\((?:chords?|tabs?|ukulele|bass|drums?|official|pro|guitar pro|power tab)\)\s*$/i;

/** Injected ad/script lines contain these tokens; real chord/lyric lines never do. */
const JUNK_TOKENS =
  /\b(?:var |function\s*\(|window\.|document\.|config\.|configPlayer|addEventListener|innerHTML|deviceType|getElementById|ResizeObserver)\b/;

/** Longest plausible chord/lyric line; the clipped JS blob is one huge line. */
const MAX_CONTENT_LINE = 200;

/** Read a top-level frontmatter scalar (handles quoted/bare values). */
function frontmatterValue(fm: string, key: string): string | undefined {
  const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, "mi"));
  if (!m) return undefined;
  return m[1].trim().replace(/^["']|["']$/g, "").trim() || undefined;
}

/** "Artist - Song (Chords)" -> { artist, title }. Falls back to the whole string. */
export function splitClipTitle(raw: string): { title: string; artist?: string } {
  const cleaned = raw.replace(PAREN_KIND, "").trim();
  const i = cleaned.indexOf(" - ");
  if (i > 0) {
    return { artist: cleaned.slice(0, i).trim(), title: cleaned.slice(i + 3).trim() };
  }
  return { title: cleaned };
}

/** Body of the first fenced code block, or null if there isn't one. */
export function extractCodeBlock(text: string): string | null {
  const m = text.match(/```[^\n]*\n([\s\S]*?)```/);
  return m ? m[1] : null;
}

/** Drop injected ad/script lines; normalize whitespace-only lines to empty. */
export function stripJunkLines(text: string): string {
  return text
    .split("\n")
    .filter((line) => line.length <= MAX_CONTENT_LINE && !JUNK_TOKENS.test(line))
    .map((line) => (line.trim() === "" ? "" : line))
    .join("\n");
}

export function parseClip(text: string): { metadata: SongMetadata; rawContent: string } {
  let body = text;
  let fmTitle: string | undefined;

  const fm = text.match(/^﻿?---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    fmTitle = frontmatterValue(fm[1], "title");
    body = text.slice(fm[0].length);
  }

  const code = extractCodeBlock(body);
  const rawContent = stripJunkLines(code !== null ? code : body);

  const { title, artist } = fmTitle ? splitClipTitle(fmTitle) : { title: "", artist: undefined };

  return {
    metadata: { title, artist, language: "English" },
    rawContent,
  };
}
