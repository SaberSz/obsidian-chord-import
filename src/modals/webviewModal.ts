import { App, Modal, Notice, Setting } from "obsidian";

/**
 * Visible in-app browser for sites behind a Cloudflare-style challenge. A hidden
 * webview can't clear "Just a moment…" (the challenge wants a real, visible,
 * interactable context), so we show the page: the challenge clears on its own or
 * the user clicks the check once, and we auto-extract the rendered HTML the
 * moment the real content (per `accept`) appears. Resolves with outerHTML so the
 * adapter parses it exactly like a direct fetch.
 */

const POLL_MS = 600;
const SAFETY_TIMEOUT_MS = 120000;
const MAX_HTML = 8_000_000;

/** Bare hostname (sans leading www.) for comparing the webview's current origin. */
function hostOf(u: string): string {
  try {
    return new URL(u).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/*
 * Re-fetch the page from inside the webview rather than reading the live DOM.
 * Many sites (Ultimate Guitar included) embed their data in server HTML, then
 * their JS consumes/rewrites that element on hydration — so document.outerHTML
 * no longer contains it. An in-page fetch reuses the webview's now-cleared
 * Cloudflare cookie + session and returns the original server HTML. Falls back
 * to the live DOM if the fetch fails.
 */
const EXTRACT_JS = `(async () => {
  try {
    const r = await fetch(location.href, { credentials: "same-origin", headers: { "Accept": "text/html" } });
    if (r.ok) { const t = await r.text(); if (t && t.length > 200) return t; }
  } catch (e) { /* fall through */ }
  return document.documentElement.outerHTML;
})()`;

export class WebviewImportModal extends Modal {
  private settled = false;
  private poll = 0;
  private timer = 0;
  private statusEl!: HTMLElement;
  // Electron <webview>: extra methods beyond lib.dom's HTMLElement.
  private webview: any = null;

  constructor(
    app: App,
    private url: string,
    private userAgent: string,
    private accept: (html: string) => boolean,
    private onDone: (html: string) => void,
    private onCancel: (reason: Error) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl, modalEl } = this;
    modalEl.addClass("chord-import-webview-modal");
    contentEl.createEl("h3", { text: "Loading chord page…" });
    this.statusEl = contentEl.createEl("p", {
      cls: "chord-import-wv-status",
      text: 'If a "Verify you are human" check appears, complete it. The chords import automatically once the page loads.',
    });

    const wv = document.createElement("webview") as any;
    // Harden the guest: isolated context, sandboxed, no node, ephemeral session.
    wv.setAttribute("webpreferences", "contextIsolation=yes,sandbox=yes,nodeIntegration=no");
    wv.setAttribute("partition", "chord-import");
    wv.setAttribute("allowpopups", "false");
    if (this.userAgent) wv.setAttribute("useragent", this.userAgent);
    wv.setAttribute("src", this.url);
    wv.addClass("chord-import-webview");
    this.webview = wv;

    wv.addEventListener("dom-ready", () => {
      if (!this.poll) this.poll = window.setInterval(() => void this.tryExtract(false), POLL_MS);
      void this.tryExtract(false);
    });
    contentEl.appendChild(wv);

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText("Use this page now")
          .setCta()
          .onClick(() => void this.tryExtract(true))
      )
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));

    this.timer = window.setTimeout(
      () => this.fail("Timed out waiting for the page to load."),
      SAFETY_TIMEOUT_MS
    );
  }

  private async tryExtract(manual: boolean): Promise<void> {
    if (this.settled || typeof this.webview?.executeJavaScript !== "function") return;
    // Don't extract if the view was redirected off the requested site.
    try {
      const current = this.webview.getURL?.();
      if (current && hostOf(current) && hostOf(current) !== hostOf(this.url)) return;
    } catch {
      /* getURL unavailable — fall through */
    }
    try {
      const html = (await this.webview.executeJavaScript(EXTRACT_JS)) as string;
      if (html && html.length <= MAX_HTML && this.accept(html)) {
        this.succeed(html);
      } else if (manual) {
        new Notice("The chords haven't loaded yet — wait a moment or finish the on-page check, then try again.");
      } else {
        this.statusEl.setText("Working through the site's check… leave this window open.");
      }
    } catch {
      /* webview busy / mid-navigation — try again next poll */
    }
  }

  private succeed(html: string): void {
    if (this.settled) return;
    this.settled = true;
    this.cleanup();
    this.close();
    this.onDone(html);
  }

  private fail(msg: string): void {
    if (this.settled) return;
    this.settled = true;
    this.cleanup();
    this.close();
    this.onCancel(new Error(msg));
  }

  private cleanup(): void {
    if (this.poll) window.clearInterval(this.poll);
    if (this.timer) window.clearTimeout(this.timer);
    try {
      this.webview?.stop?.();
    } catch {
      /* ignore */
    }
  }

  onClose(): void {
    this.cleanup();
    this.contentEl.empty();
    if (!this.settled) {
      this.settled = true;
      this.onCancel(new Error("cancelled"));
    }
  }
}
