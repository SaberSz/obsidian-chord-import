import { App, requestUrl } from "obsidian";
import { availabilityUrl, toRawSnapshotUrl } from "./wayback";
import { fetchViaWebview, webviewAvailable } from "./webviewFetch";

/**
 * Layered fetch: many chord sites (Ultimate Guitar in particular) sit behind
 * Cloudflare-style bot protection that 403s a plain request. We try cheap,
 * cross-platform strategies first and fall back to a real browser render:
 *
 *   1. direct request with a full browser header set
 *   2. Wayback Machine snapshot (not Cloudflare-gated; has the original HTML)
 *   3. hidden Electron <webview> render (desktop only — solves JS challenges)
 *
 * Each strategy's output is validated by `accept(html)` (e.g. "does it contain
 * the js-store?") so a 200 challenge/placeholder page doesn't count as success.
 * If all fail, the error points the user at the paste-text command.
 */

export interface FetchOptions {
  userAgent: string;
  useWayback: boolean;
  useWebview: boolean;
  /** Needed for the desktop webview fallback (opens an in-app browser modal). */
  app: App;
  /** True if the HTML is the real content page (not a block/challenge/empty). */
  accept: (html: string) => boolean;
  /** Optional progress callback (e.g. to show a Notice per attempt). */
  onProgress?: (message: string) => void;
}

/** Browser-like headers; some WAF rules pass once these are all present. */
function browserHeaders(userAgent: string): Record<string, string> {
  return {
    "User-Agent": userAgent,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  };
}

/** Reject absurdly large bodies — parsing runs on the UI thread. */
const MAX_HTML_BYTES = 8_000_000;

function boundedText(text: string): string {
  if (text.length > MAX_HTML_BYTES) throw new Error("response too large");
  return text;
}

async function fetchDirect(url: string, userAgent: string): Promise<string> {
  const res = await requestUrl({ url, headers: browserHeaders(userAgent), throw: false });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`HTTP ${res.status}`);
  }
  return boundedText(res.text);
}

async function fetchViaWayback(url: string, userAgent: string): Promise<string> {
  const headers = { "User-Agent": userAgent };
  const lookup = await requestUrl({ url: availabilityUrl(url), headers, throw: false });
  if (lookup.status !== 200) throw new Error(`availability lookup HTTP ${lookup.status}`);

  const snap = lookup.json?.archived_snapshots?.closest;
  if (!snap?.available || !snap.url) throw new Error("no snapshot archived");

  // Pin the snapshot to the archive host — never follow it to an arbitrary host.
  const snapUrl = toRawSnapshotUrl(String(snap.url));
  let snapHost = "";
  try {
    snapHost = new URL(snapUrl).hostname.toLowerCase();
  } catch {
    throw new Error("invalid snapshot URL");
  }
  if (snapHost !== "web.archive.org") throw new Error("unexpected snapshot host");

  const page = await requestUrl({ url: snapUrl, headers, throw: false });
  if (page.status < 200 || page.status >= 300) throw new Error(`snapshot HTTP ${page.status}`);
  return boundedText(page.text);
}

export async function fetchHtml(url: string, opts: FetchOptions): Promise<string> {
  const strategies: Array<{ label: string; enabled: boolean; run: () => Promise<string> }> = [
    { label: "direct request", enabled: true, run: () => fetchDirect(url, opts.userAgent) },
    {
      label: "Wayback Machine",
      enabled: opts.useWayback,
      run: () => fetchViaWayback(url, opts.userAgent),
    },
    {
      label: "browser render",
      enabled: opts.useWebview && webviewAvailable(),
      run: () => fetchViaWebview(opts.app, url, opts.userAgent, opts.accept),
    },
  ];

  const errors: string[] = [];
  for (const s of strategies) {
    if (!s.enabled) continue;
    try {
      opts.onProgress?.(`Fetching via ${s.label}…`);
      const html = await s.run();
      if (opts.accept(html)) return html;
      errors.push(`${s.label}: blocked or no chord data`);
    } catch (e) {
      errors.push(`${s.label}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  throw new Error(
    `Couldn't fetch the page (${errors.join("; ")}). ` +
      'Copy the chord chart and use "Import song from pasted text" instead.'
  );
}
