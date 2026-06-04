/**
 * Wayback Machine (web.archive.org) URL helpers — pure, no Obsidian/DOM deps so
 * they're unit-testable. The Wayback Machine isn't behind Cloudflare and its
 * snapshots contain the original server-rendered HTML (including UG's js-store),
 * so it works as a fetch fallback when the live site blocks us.
 */

/** Availability API: returns the closest snapshot for a URL as JSON. */
export function availabilityUrl(targetUrl: string): string {
  return `https://archive.org/wayback/available?url=${encodeURIComponent(targetUrl)}`;
}

/**
 * Turn a snapshot URL into its RAW capture form: insert the `id_` modifier after
 * the timestamp and force https. `id_` returns the original unmodified resource
 * (no Wayback toolbar/rewrites), so the embedded js-store survives intact.
 *
 *   http://web.archive.org/web/20230101000000/https://site/x
 *   -> https://web.archive.org/web/20230101000000id_/https://site/x
 */
export function toRawSnapshotUrl(snapshotUrl: string): string {
  return snapshotUrl
    .replace(/^http:\/\//i, "https://")
    .replace(/(\/web\/\d{4,14})(id_|if_|im_)?\//, "$1id_/");
}
