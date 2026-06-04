import { App, TFile, normalizePath } from "obsidian";
import { SongMetadata } from "./types";

/** Used if the vault's template can't be found. Mirrors Templates/Chords Template.md. */
const FALLBACK_TEMPLATE =
  `---\nLanguage: English\nTempo:\nSignature: 4/4\nStyle:\nSpeed: Slow\ntags:\nArtist:\n---\n` +
  "```chords\n\nLyrics and chords\n```\n";

/** Remove ASCII control characters (code < 0x20) without touching normal text. */
function stripControlChars(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) >= 0x20) out += s[i];
  }
  return out;
}

/** Strip characters illegal in filenames; collapse whitespace; avoid dotfiles
 *  and Windows reserved names. Path separators are stripped, so titles from
 *  untrusted pages can't traverse out of the target folder. */
export function sanitizeFilename(name: string): string {
  let s = stripControlChars(name)
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "") // no leading dots → no hidden/dot files
    .trim();
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(s)) s = `_${s}`; // Windows reserved
  return s;
}

/** Render an untrusted value as a safe single-line double-quoted YAML scalar,
 *  so page data can't inject frontmatter keys or break out of the block. */
function yamlValue(s: string): string {
  const clean = stripControlChars(s.replace(/[\r\n\t]+/g, " ")).trim();
  return `"${clean.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function applyFilenameTemplate(tpl: string, meta: SongMetadata): string {
  const filled = tpl
    .replace(/\{\{title\}\}/g, () => meta.title)
    .replace(/\{\{artist\}\}/g, () => meta.artist ?? "");
  return sanitizeFilename(filled) || sanitizeFilename(meta.title) || "Untitled";
}

export async function loadTemplate(app: App, templatePath: string): Promise<string> {
  const f = app.vault.getAbstractFileByPath(normalizePath(templatePath));
  if (f instanceof TFile) return await app.vault.read(f);
  return FALLBACK_TEMPLATE;
}

/**
 * Fill the template's frontmatter with the metadata we have and replace its
 * placeholder ```chords block with the imported one. Untrusted values are
 * YAML-escaped, and replacements use function form so a `$` in the data can't be
 * interpreted as a replacement pattern. Only fields we can derive reliably are
 * filled; Speed/Style/tags/Tempo are left for the user's review.
 */
export function buildNoteContent(template: string, meta: SongMetadata, chordsBlock: string): string {
  let out = template;

  const artist = meta.artist;
  const language = meta.language;
  const signature = meta.signature;
  if (artist) out = out.replace(/^Artist:\s*$/m, () => `Artist: ${yamlValue(artist)}`);
  if (language) out = out.replace(/^Language:\s*$/m, () => `Language: ${yamlValue(language)}`);
  if (signature) out = out.replace(/^Signature:\s*.*$/m, () => `Signature: ${yamlValue(signature)}`);

  // Replace the template's (possibly empty) chords block with ours.
  if (/```chords[\s\S]*?```/.test(out)) {
    out = out.replace(/```chords[\s\S]*?```/, () => chordsBlock);
  } else {
    out = out.trimEnd() + "\n\n" + chordsBlock + "\n";
  }
  return out;
}
