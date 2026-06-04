import { App, Platform } from "obsidian";
import { WebviewImportModal } from "./modals/webviewModal";

/**
 * Desktop-only fetch via a VISIBLE in-app Electron browser (see WebviewImportModal).
 * A real Chromium view lets the user clear Cloudflare-style challenges exactly as
 * their own browser would; we then read the rendered HTML back out. Mobile has no
 * <webview>, so callers gate on webviewAvailable().
 */

/** True on Obsidian desktop, where the Electron <webview> tag is available. */
export function webviewAvailable(): boolean {
  return Platform.isDesktopApp;
}

export function fetchViaWebview(
  app: App,
  url: string,
  userAgent: string,
  accept: (html: string) => boolean
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    new WebviewImportModal(app, url, userAgent, accept, resolve, reject).open();
  });
}
