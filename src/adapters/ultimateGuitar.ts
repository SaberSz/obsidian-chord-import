import { SiteAdapter, ImportResult } from "../types";
import { hostMatches } from "./hostname";

/**
 * Ultimate Guitar adapter. UG embeds all song data as HTML-escaped JSON in a
 * <div class="js-store" data-content="..."> element. See docs/ULTIMATE-GUITAR.md.
 *
 * NOTE: the exact JSON paths can drift between UG releases. Verify/adjust these
 * against a saved fixture in tests/fixtures/ — that's what the fixture tests guard.
 */

function htmlUnescape(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

export const ultimateGuitarAdapter: SiteAdapter = {
  id: "ultimate-guitar",

  matches(url: string): boolean {
    return hostMatches(url, "ultimate-guitar.com");
  },

  isLikelyValid(html: string): boolean {
    // The real song page embeds the data store; a Cloudflare/block page won't.
    return /class="js-store"/.test(html);
  },

  parse(html: string): ImportResult {
    const m = html.match(/class="js-store"[^>]*\bdata-content="([^"]*)"/);
    if (!m) {
      throw new Error("Couldn't find the Ultimate Guitar data store — the page format may have changed.");
    }

    let json: any;
    try {
      json = JSON.parse(htmlUnescape(m[1]));
    } catch {
      throw new Error("Couldn't parse the Ultimate Guitar data (invalid JSON).");
    }

    const data = json?.store?.page?.data;
    const tab = data?.tab;
    const content: string | undefined = data?.tab_view?.wiki_tab?.content;

    if (!tab) {
      throw new Error("Couldn't read the song data from this Ultimate Guitar page.");
    }
    if (!content) {
      const kind = tab.type_name ?? tab.type ?? "this type of";
      throw new Error(
        `No importable chord text — "${kind}" pages (e.g. Official/Pro tabs) aren't supported. Use a standard Chords page.`
      );
    }

    return {
      metadata: {
        title: tab.song_name ?? "Untitled",
        artist: tab.artist_name ?? undefined,
        key: tab.tonality ?? undefined, // captured, unused in v1
        capo: typeof tab.capo === "number" ? tab.capo : undefined, // captured, unused in v1
        language: "English", // UG songs are overwhelmingly English; user can change
      },
      rawContent: content,
    };
  },
};
