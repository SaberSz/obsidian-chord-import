import { Notice, Plugin, TFile, normalizePath } from "obsidian";
import { ChordImportSettings, DEFAULT_SETTINGS, ChordImportSettingTab } from "./settings";
import { ImportModal } from "./modals/importModal";
import { PasteModal } from "./modals/pasteModal";
import { ClipModal } from "./modals/clipModal";
import { DuplicateModal, DuplicateChoice } from "./modals/duplicateModal";
import { findAdapter } from "./adapters";
import { fetchHtml } from "./fetcher";
import { formatChordBlock, wrapChordsFence } from "./formatter";
import { loadTemplate, buildNoteContent, applyFilenameTemplate } from "./noteBuilder";
import { SongMetadata } from "./types";

export default class ChordImportPlugin extends Plugin {
  settings: ChordImportSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addCommand({
      id: "import-song-from-url",
      name: "Import song from URL",
      callback: () => {
        new ImportModal(this.app, (url) => void this.importFromUrl(url)).open();
      },
    });

    this.addCommand({
      id: "import-song-from-text",
      name: "Import song from pasted text",
      callback: () => {
        new PasteModal(this.app, ({ metadata, rawContent }) =>
          void this.writeNote(metadata, rawContent)
        ).open();
      },
    });

    // Cross-platform path (works on iPad/iPhone too): paste a clipped page
    // (e.g. from Obsidian Web Clipper) and we detect title/artist/chords.
    this.addCommand({
      id: "import-clipped-page",
      name: "Import song from clipped page",
      callback: () => {
        new ClipModal(this.app, ({ metadata, rawContent }) =>
          void this.writeNote(metadata, rawContent)
        ).open();
      },
    });

    this.addSettingTab(new ChordImportSettingTab(this.app, this));
  }

  /** URL pipeline: fetch -> parse -> writeNote. */
  async importFromUrl(url: string): Promise<void> {
    try {
      const adapter = findAdapter(url);
      if (!adapter) {
        new Notice(
          "No importer for that site yet (supported: Ultimate Guitar, Worship Together, pnwchords). For other sites, use \"Import song from pasted text\" or \"…from clipped page\"."
        );
        return;
      }

      const notice = new Notice("Importing…", 0);
      let html: string;
      try {
        html = await fetchHtml(url, {
          userAgent: this.settings.userAgent,
          useWayback: this.settings.useWayback,
          useWebview: this.settings.useWebviewFallback,
          app: this.app,
          accept: (h) => (adapter.isLikelyValid ? adapter.isLikelyValid(h) : true),
          onProgress: (m) => notice.setMessage(m),
        });
      } finally {
        notice.hide();
      }
      const { metadata, rawContent } = adapter.parse(html, url);
      await this.writeNote(metadata, rawContent);
    } catch (e) {
      console.error("[chord-import] import from URL failed:", e);
      new Notice(`Import failed: ${e instanceof Error ? e.message : String(e)}`, 10000);
    }
  }

  /** Format -> build -> write the note (with duplicate handling). Shared by URL and paste imports. */
  async writeNote(metadata: SongMetadata, rawContent: string): Promise<void> {
    try {
      const block = wrapChordsFence(formatChordBlock(rawContent));
      const template = await loadTemplate(this.app, this.settings.templatePath);
      const content = buildNoteContent(template, metadata, block);

      const filename = applyFilenameTemplate(this.settings.filenameTemplate, metadata);
      let path = normalizePath(`${this.settings.targetFolder}/${filename}.md`);

      const existing = this.app.vault.getAbstractFileByPath(path);
      if (existing instanceof TFile) {
        const choice = await this.resolveDuplicate(filename);
        if (choice === null) return; // dismissed
        if (choice === "open") {
          await this.app.workspace.getLeaf(true).openFile(existing);
          return;
        }
        if (choice === "overwrite") {
          await this.app.vault.modify(existing, content);
          new Notice(`Updated "${filename}".`);
          await this.app.workspace.getLeaf(true).openFile(existing);
          return;
        }
        // rename
        path = await this.uniquePath(this.settings.targetFolder, filename);
      }

      const file = await this.app.vault.create(path, content);
      new Notice(`Imported "${metadata.title}".`);
      await this.app.workspace.getLeaf(true).openFile(file);
    } catch (e) {
      console.error("[chord-import] writing note failed:", e);
      new Notice(`Import failed: ${e instanceof Error ? e.message : String(e)}`, 10000);
    }
  }

  private resolveDuplicate(name: string): Promise<DuplicateChoice | null> {
    switch (this.settings.duplicateBehavior) {
      case "overwrite":
        return Promise.resolve<DuplicateChoice>("overwrite");
      case "rename":
        return Promise.resolve<DuplicateChoice>("rename");
      default:
        return new Promise((resolve) => new DuplicateModal(this.app, name, resolve).open());
    }
  }

  private async uniquePath(folder: string, base: string): Promise<string> {
    for (let i = 2; ; i++) {
      const p = normalizePath(`${folder}/${base} (${i}).md`);
      if (!this.app.vault.getAbstractFileByPath(p)) return p;
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
