import { App, Modal, Notice, Setting } from "obsidian";
import { SongMetadata } from "../types";
import { parseClip } from "../clipParser";

export interface ClipInput {
  metadata: SongMetadata;
  rawContent: string;
}

/**
 * Paste a whole clipped chord page (e.g. from Obsidian Web Clipper) into one
 * box; the title, artist, and chords are detected automatically (see
 * clipParser). This is the cross-platform path — it works the same on desktop
 * and iPad/iPhone, no active note required.
 */
export class ClipModal extends Modal {
  private text = "";
  private onSubmit: (input: ClipInput) => void;

  constructor(app: App, onSubmit: (input: ClipInput) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("chord-import-modal");
    contentEl.createEl("h3", { text: "Import song from clipped page" });
    contentEl.createEl("p", {
      cls: "chord-import-wv-status",
      text: "Paste a clipped chord page (e.g. from Obsidian Web Clipper). Title, artist, and chords are detected automatically.",
    });

    const ta = contentEl.createEl("textarea", { cls: "chord-import-textarea" });
    ta.rows = 18;
    ta.placeholder = "Paste the whole clipped page here…";
    ta.addEventListener("input", () => (this.text = ta.value));
    window.setTimeout(() => ta.focus(), 0);

    new Setting(contentEl).addButton((b) =>
      b.setButtonText("Import").setCta().onClick(() => this.submit())
    );
  }

  private submit(): void {
    if (!this.text.trim()) {
      new Notice("Paste the clipped page first.");
      return;
    }
    const { metadata, rawContent } = parseClip(this.text);
    if (!rawContent.trim()) {
      new Notice("Couldn't find any chord content in that clip.");
      return;
    }
    if (!metadata.title) {
      new Notice(
        "Couldn't detect a song title — paste the full clip (with its title), or use \"Import song from pasted text\" to set one."
      );
      return;
    }
    this.close();
    this.onSubmit({ metadata, rawContent });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
