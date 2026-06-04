/**
 * True if `url` is a valid http(s) URL whose host is exactly `domain` or a
 * subdomain of it. Used for adapter routing so we match on the real hostname
 * (not a substring), and reject non-http(s) schemes — closing scheme-confusion
 * / SSRF tricks like "file:///etc/passwd#example.com" or
 * "http://169.254.169.254/?x=example.com".
 */
export function hostMatches(url: string, domain: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  const d = domain.toLowerCase();
  return host === d || host.endsWith(`.${d}`);
}
