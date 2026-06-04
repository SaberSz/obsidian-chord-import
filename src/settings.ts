import { App, PluginSettingTab, Setting } from "obsidian";
import type ChordImportPlugin from "./main";

export type DuplicateBehavior = "ask" | "rename" | "overwrite";

export interface ChordImportSettings {
  targetFolder: string;
  templatePath: string;
  filenameTemplate: string;
  duplicateBehavior: DuplicateBehavior;
  userAgent: string;
  /** Fall back to a Wayback Machine snapshot when the live fetch is blocked. */
  useWayback: boolean;
  /** Desktop only: fall back to a real-browser webview render to beat bot blocks. */
  useWebviewFallback: boolean;
}

export const DEFAULT_SETTINGS: ChordImportSettings = {
  targetFolder: "Music Chords",
  templatePath: "Templates/Chords Template.md",
  filenameTemplate: "{{title}}",
  duplicateBehavior: "ask",
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  useWayback: true,
  useWebviewFallback: true,
};

export class ChordImportSettingTab extends PluginSettingTab {
  plugin: ChordImportPlugin;

  constructor(app: App, plugin: ChordImportPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Target folder")
      .setDesc("Folder where imported songs are created.")
      .addText((t) =>
        t.setValue(this.plugin.settings.targetFolder).onChange(async (v) => {
          this.plugin.settings.targetFolder = v.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Template path")
      .setDesc("Note template to base imports on.")
      .addText((t) =>
        t.setValue(this.plugin.settings.templatePath).onChange(async (v) => {
          this.plugin.settings.templatePath = v.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Filename template")
      .setDesc("Supports {{title}} and {{artist}}.")
      .addText((t) =>
        t.setValue(this.plugin.settings.filenameTemplate).onChange(async (v) => {
          this.plugin.settings.filenameTemplate = v.trim() || "{{title}}";
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("On duplicate name")
      .setDesc("What to do when a note of the same name already exists.")
      .addDropdown((d) =>
        d
          .addOption("ask", "Ask each time")
          .addOption("rename", "Save as renamed copy")
          .addOption("overwrite", "Overwrite")
          .setValue(this.plugin.settings.duplicateBehavior)
          .onChange(async (v) => {
            this.plugin.settings.duplicateBehavior = v as DuplicateBehavior;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("User-Agent")
      .setDesc("Sent when fetching chord pages.")
      .addText((t) =>
        t.setValue(this.plugin.settings.userAgent).onChange(async (v) => {
          this.plugin.settings.userAgent = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl).setName("When a site blocks the request").setHeading();

    new Setting(containerEl)
      .setName("Try the Wayback Machine")
      .setDesc("If the live fetch is blocked, fall back to an archived snapshot of the page.")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.useWayback).onChange(async (v) => {
          this.plugin.settings.useWayback = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Browser-render fallback (desktop only)")
      .setDesc(
        "Last resort: load the page in a hidden browser view so it can pass bot checks, then read the chords. Has no effect on mobile."
      )
      .addToggle((t) =>
        t.setValue(this.plugin.settings.useWebviewFallback).onChange(async (v) => {
          this.plugin.settings.useWebviewFallback = v;
          await this.plugin.saveSettings();
        })
      );
  }
}
