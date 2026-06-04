/** Metadata extracted from a chord page. Fields that can't be derived stay undefined. */
export interface SongMetadata {
  title: string;
  artist?: string;
  language?: string;
  signature?: string;
  /** Captured but UNUSED in v1 — the user picks the key and transposes manually. */
  key?: string;
  /** Captured but UNUSED in v1. */
  capo?: number;
}

export interface ImportResult {
  metadata: SongMetadata;
  /**
   * Raw chord/lyric text in the source site's markup (e.g. UG's [ch]/[tab]),
   * BEFORE formatting. The source-agnostic formatter turns this into the
   * vault's ```chords block body.
   */
  rawContent: string;
}

export interface SiteAdapter {
  id: string;
  /** True if this adapter handles the given URL (routed by hostname). */
  matches(url: string): boolean;
  /**
   * Parse fetched HTML into metadata + raw content.
   * Throw a user-facing Error on unsupported page types or parse failure.
   */
  parse(html: string, url: string): ImportResult;
  /**
   * Optional: true if `html` looks like the real content page (rather than a
   * bot-block/challenge/empty page). The fetcher uses this to decide whether a
   * fetch strategy succeeded before falling back to the next one. Defaults to
   * "always valid" if omitted.
   */
  isLikelyValid?(html: string): boolean;
}
