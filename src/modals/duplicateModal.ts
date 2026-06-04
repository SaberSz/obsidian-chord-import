import { App, Modal, Setting } from "obsidian";

export type DuplicateChoice = "open" | "rename" | "overwrite";

/**
 * Shown when a note of the same name already exists. Resolves with the user's
 * choice, or null if they dismiss the modal without choosing.
 */
export class DuplicateModal extends Modal {
  private name: string;
  private onChoose: (choice: DuplicateChoice | null) => void;
  private chosen = false;

  constructor(app: App, name: string, onChoose: (choice: DuplicateChoice | null) => void) {
    super(app);
    this.name = name;
    this.onChoose = onChoose;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Song already exists" });
    contentEl.createEl("p", {
      text: `A note named "${this.name}" already exists in the target folder.`,
    });

    new Setting(contentEl)
      .addButton((b) => b.setButtonText("Open existing").onClick(() => this.pick("open")))
      .addButton((b) => b.setButtonText("Save renamed").onClick(() => this.pick("rename")))
      .addButton((b) => b.setButtonText("Overwrite").setWarning().onClick(() => this.pick("overwrite")));
  }

  private pick(choice: DuplicateChoice): void {
    this.chosen = true;
    this.close();
    this.onChoose(choice);
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.chosen) this.onChoose(null);
  }
}
