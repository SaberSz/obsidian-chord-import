import { App, Modal, Notice, Setting } from "obsidian";
import { SongMetadata } from "../types";
import { parseClip } from "../clipParser";

export interface PasteInput {
  metadata: SongMetadata;
  rawContent: string;
}

/**
 * Source-less import: the user pastes a chord chart (e.g. copied from a site
 * that blocks automated fetching, or a non-English song not on mainstream
 * sites). The pasted text runs through the same formatter as URL imports —
 * [ch]/[tab] markers are stripped and positional alignment is preserved.
 */
export class PasteModal extends Modal {
  private title = "";
  private artist = "";
  private content = "";
  private onSubmit: (input: PasteInput) => void;

  constructor(app: App, onSubmit: (input: PasteInput) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("chord-import-modal");
    contentEl.createEl("h3", { text: "Import song from pasted text" });

    new Setting(contentEl).setName("Title").addText((t) => {
      t.setPlaceholder("Song title").onChange((v) => (this.title = v.trim()));
      t.inputEl.focus();
    });

    new Setting(contentEl)
      .setName("Artist")
      .setDesc("Optional.")
      .addText((t) => t.onChange((v) => (this.artist = v.trim())));

    new Setting(contentEl)
      .setName("Chords & lyrics")
      .setDesc("Paste the chord chart. [ch]/[tab] markers are fine; spacing/alignment is preserved as-is.");

    const ta = contentEl.createEl("textarea", { cls: "chord-import-textarea" });
    ta.rows = 16;
    ta.placeholder = "[Verse 1]\nG           C       D         G\nAbove all powers, Above all Kings\n...";
    ta.addEventListener("input", () => (this.content = ta.value));

    new Setting(contentEl).addButton((b) =>
      b.setButtonText("Import").setCta().onClick(() => this.submit())
    );
  }

  private submit(): void {
    if (!this.content.trim()) {
      new Notice("Paste the chords/lyrics first.");
      return;
    }

    let title = this.title;
    let artist = this.artist;
    let content = this.content;

    // If a whole clipped page was pasted (frontmatter and/or a code block),
    // pull out just the chord chart and fill in any blank title/artist.
    if (content.includes("```") || content.trimStart().startsWith("---")) {
      const parsed = parseClip(content);
      if (parsed.rawContent.trim()) content = parsed.rawContent;
      if (!title) title = parsed.metadata.title ?? "";
      if (!artist) artist = parsed.metadata.artist ?? "";
    }

    if (!title) {
      new Notice("Enter a title.");
      return;
    }

    this.close();
    this.onSubmit({
      metadata: { title, artist: artist || undefined, language: "English" },
      rawContent: content,
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
