import { SiteAdapter, ImportResult } from "../types";
import { hostMatches } from "./hostname";

/**
 * pnwchords.com adapter. Song pages (WordPress) render the whole chord chart in
 * a single plain-text <pre> block, so the positional chord-over-lyric alignment
 * is already intact — we extract the <pre>, strip any stray inline tags, decode
 * HTML entities, and let the shared formatter bracket the section headers
 * (plain "Verse1"/"Chorus"/etc.). Title/artist come from og:title
 * ("<Song> Chords - <Artist>"). Not Cloudflare-gated.
 */

function decode(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function metaTitle(html: string): string {
  const og = html.match(/property="og:title"\s+content="([^"]*)"/i);
  if (og) return decode(og[1]);
  const t = html.match(/<title>([^<]*)<\/title>/i);
  return t ? decode(t[1]) : "";
}

/** "<Song> Chords - <Artist>" -> { title, artist }. */
function splitTitle(raw: string): { title: string; artist?: string } {
  const s = raw.replace(/\s*[|–-]\s*pnwchords.*$/i, "").trim();
  const dash = s.indexOf(" - ");
  let songPart = s;
  let artist: string | undefined;
  if (dash > 0) {
    songPart = s.slice(0, dash).trim();
    artist = s.slice(dash + 3).trim();
  }
  const title = songPart.replace(/\s+chords$/i, "").trim();
  return { title: title || songPart, artist };
}

export const pnwChordsAdapter: SiteAdapter = {
  id: "pnwchords",

  matches(url: string): boolean {
    return hostMatches(url, "pnwchords.com");
  },

  isLikelyValid(html: string): boolean {
    return /<pre[\s>]/i.test(html);
  },

  parse(html: string): ImportResult {
    // Strip HTML comments first so a stray "<pre>" mention in a comment can't
    // be mistaken for the real chart block.
    const cleaned = html.replace(/<!--[\s\S]*?-->/g, "");
    const m = cleaned.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (!m) {
      throw new Error("Couldn't find the chord chart on this pnwchords page — its format may have changed.");
    }

    const rawContent = decode(m[1].replace(/<[^>]+>/g, ""))
      .replace(/\r\n?/g, "\n")
      .trim();
    if (!rawContent) {
      throw new Error("This pnwchords page has no importable chord text.");
    }

    const { title, artist } = splitTitle(metaTitle(html) || "Untitled");

    return {
      metadata: {
        title: title || "Untitled",
        artist,
        language: "English",
      },
      rawContent,
    };
  },
};
