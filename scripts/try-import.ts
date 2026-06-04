/*
 * Offline harness: runs the REAL adapter + formatter + noteBuilder against a
 * saved HTML file, printing the metadata and the exact note the plugin would
 * write. Lets us validate a UG page without loading Obsidian.
 *
 * Usage (via scripts/import-url.mjs, which transpiles this):
 *   node scripts/import-url.mjs <saved-page.html>
 */
import { readFileSync } from "node:fs";
import { findAdapter } from "../src/adapters";
import { formatChordBlock, wrapChordsFence } from "../src/formatter";
import { buildNoteContent, applyFilenameTemplate } from "../src/noteBuilder";

// Mirrors Templates/Chords Template.md (the noteBuilder fallback, since we have
// no live vault here).
const TEMPLATE =
  `---\nLanguage: English\nTempo:\nSignature: 4/4\nStyle:\nSpeed: Slow\ntags:\nArtist:\n---\n` +
  "```chords\n\nLyrics and chords\n```\n";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/import-url.mjs <saved-page.html>");
  process.exit(1);
}

const url = process.argv[3] ?? "https://tabs.ultimate-guitar.com/";
const html = readFileSync(file, "utf8");

const adapter = findAdapter(url);
if (!adapter) {
  console.error("No adapter matched the URL:", url);
  process.exit(1);
}

const { metadata, rawContent } = adapter.parse(html, url);
const block = wrapChordsFence(formatChordBlock(rawContent));
const note = buildNoteContent(TEMPLATE, metadata, block);
const filename = applyFilenameTemplate("{{title}}", metadata);

const rule = "=".repeat(60);
console.log(rule);
console.log("METADATA");
console.log(rule);
console.log(JSON.stringify(metadata, null, 2));
console.log();
console.log(rule);
console.log(`TARGET FILE:  Music Chords/${filename}.md`);
console.log(rule);
console.log();
console.log(rule);
console.log("NOTE CONTENT (exactly what gets written)");
console.log(rule);
console.log(note);
