import { App, Modal, Setting } from "obsidian";

/** Prompts for a chord-page URL and invokes onSubmit with the trimmed value. */
export class ImportModal extends Modal {
  private url = "";
  private onSubmit: (url: string) => void;

  constructor(app: App, onSubmit: (url: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("chord-import-modal");
    contentEl.createEl("h3", { text: "Import song from URL" });

    new Setting(contentEl).setName("Chord page URL").addText((t) => {
      t.setPlaceholder("Ultimate Guitar or Worship Together song URL").onChange((v) => (this.url = v.trim()));
      t.inputEl.focus();
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.submit();
      });
    });

    new Setting(contentEl).addButton((b) =>
      b.setButtonText("Import").setCta().onClick(() => this.submit())
    );
  }

  private submit(): void {
    if (!this.url) return;
    this.close();
    this.onSubmit(this.url);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
