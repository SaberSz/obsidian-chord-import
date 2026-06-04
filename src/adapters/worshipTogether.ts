import { SiteAdapter, ImportResult } from "../types";
import { normalizeHeaderLine } from "../formatter";
import { hostMatches } from "./hostname";

/**
 * Worship Together adapter. Song pages render the chart as a structured
 * chord-pro DOM (no [ch] markup like UG): each line is a row of segments, and
 * each segment pairs a chord with the lyric fragment it sits over —
 *
 *   <div class="chord-pro-line">
 *     <div class="chord-pro-segment">
 *       <div class="chord-pro-note">D&nbsp;</div>
 *       <div class="chord-pro-lyric">You were the Word…</div>
 *     </div>
 *   </div>
 *
 * We reconstruct positional chord-over-lyric text from that (placing each chord
 * at the column where its lyric fragment begins), then let the shared formatter
 * bracket section headers. WT isn't Cloudflare-gated, so the direct fetch tier
 * generally works. Verify against tests/fixtures/ when WT changes its markup.
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

interface Segment {
  chord: string;
  lyric: string;
}

/** Place each chord at the column where its lyric fragment starts. */
function renderLine(segments: Segment[]): string {
  let lyric = "";
  let chords = "";
  let hasChord = false;
  for (const { chord, lyric: text } of segments) {
    const col = lyric.length;
    if (chord) {
      hasChord = true;
      if (chords.length < col) chords += " ".repeat(col - chords.length);
      else if (chords.length > col) chords += " "; // keep at least one space between chords
      chords += chord;
    }
    lyric += text;
  }
  const lyricLine = lyric.replace(/\s+$/, "");
  return hasChord ? `${chords.replace(/\s+$/, "")}\n${lyricLine}` : lyricLine;
}

/** Group the chord-pro tokens into lines of segments, in document order. */
function parseLines(region: string): Segment[][] {
  const token =
    /(class="chord-pro-line")|class="chord-pro-note">([\s\S]*?)<\/div>|class="chord-pro-lyric">([\s\S]*?)<\/div>/g;
  const lines: Segment[][] = [];
  let current: Segment[] | null = null;
  let pendingChord = "";
  let m: RegExpExecArray | null;
  while ((m = token.exec(region)) !== null) {
    if (m[1] !== undefined) {
      if (current) lines.push(current);
      current = [];
      pendingChord = "";
    } else if (m[2] !== undefined) {
      pendingChord = decode(m[2]).trim();
    } else if (m[3] !== undefined) {
      if (!current) current = [];
      current.push({ chord: pendingChord, lyric: decode(m[3]) });
      pendingChord = "";
    }
  }
  if (current) lines.push(current);
  return lines;
}

export const worshipTogetherAdapter: SiteAdapter = {
  id: "worship-together",

  matches(url: string): boolean {
    return hostMatches(url, "worshiptogether.com");
  },

  isLikelyValid(html: string): boolean {
    return /id="chordPro"/.test(html);
  },

  parse(html: string): ImportResult {
    const idx = html.search(/id="chordPro"/);
    if (idx < 0) {
      throw new Error("Couldn't find the chord chart on this Worship Together page — its format may have changed.");
    }
    const region = html.slice(idx);

    const lines = parseLines(region).map(renderLine).filter((l) => l.trim() !== "");

    // Add a blank line before each section header so sections aren't crammed
    // together (matches the vault's chord-block conventions).
    const out: string[] = [];
    for (const block of lines) {
      const isHeader = normalizeHeaderLine(block.split("\n")[0]) !== null;
      if (isHeader && out.length && out[out.length - 1] !== "") out.push("");
      out.push(block);
    }
    const rawContent = out.join("\n").trim();

    if (!rawContent) {
      throw new Error(
        "This Worship Together page has no importable chord text (it may be lyrics-only or chart-as-PDF)."
      );
    }

    // og:title is "Title - Artist | Worship Together".
    const og =
      html.match(/property="og:title"\s+content="([^"]*)"/i) ?? html.match(/<title>([^<]*)<\/title>/i);
    let title = "Untitled";
    let artist: string | undefined;
    if (og) {
      const raw = decode(og[1]).replace(/\s*\|\s*Worship Together\s*$/i, "").trim();
      const dash = raw.indexOf(" - ");
      if (dash > 0) {
        title = raw.slice(0, dash).trim();
        artist = raw.slice(dash + 3).trim();
      } else {
        title = raw || "Untitled";
      }
    }

    const keyMatch = html.match(/id="chordPro"[^>]*\bdata-original-key="([^"]*)"/i);

    return {
      metadata: {
        title,
        artist,
        key: keyMatch?.[1] || undefined, // captured, unused in v1
        language: "English",
      },
      rawContent,
    };
  },
};
