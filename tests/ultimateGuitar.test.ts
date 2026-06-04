import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ultimateGuitarAdapter as ug } from "../src/adapters/ultimateGuitar";
import { formatChordBlock } from "../src/formatter";

const here = path.dirname(fileURLToPath(import.meta.url));

/** HTML-entity-escape a string the way UG escapes its data-content attribute. */
function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&#39;");
}

/** Wrap a UG `store` payload in a minimal page with the js-store div. */
function pageWith(data: unknown): string {
  const json = JSON.stringify({ store: { page: { data } } });
  return `<!doctype html><html><body><div class="js-store" data-content="${htmlEscape(
    json
  )}"></div></body></html>`;
}

test("matches Ultimate Guitar URLs by hostname, rejects others", () => {
  assert.ok(ug.matches("https://tabs.ultimate-guitar.com/tab/foo/bar-chords-123"));
  assert.ok(ug.matches("https://www.ultimate-guitar.com/whatever"));
  assert.ok(!ug.matches("https://www.worshiptogether.com/songs/x"));
});

test("matches() validates scheme + real hostname (no SSRF/substring tricks)", () => {
  assert.ok(!ug.matches("file:///etc/passwd#ultimate-guitar.com"));
  assert.ok(!ug.matches("http://169.254.169.254/latest/meta-data?x=ultimate-guitar.com"));
  assert.ok(!ug.matches("https://ultimate-guitar.com.attacker.test/x"));
  assert.ok(!ug.matches("https://notultimate-guitar.com/x"));
  assert.ok(!ug.matches("javascript:alert(1)//ultimate-guitar.com"));
  assert.ok(!ug.matches("not a url"));
});

test("isLikelyValid distinguishes a real page from a block/challenge page", () => {
  const real = pageWith({ tab: { song_name: "x", type_name: "Chords" }, tab_view: { wiki_tab: { content: "y" } } });
  assert.equal(ug.isLikelyValid?.(real), true);
  assert.equal(ug.isLikelyValid?.("<html><body>Just a moment… checking your browser</body></html>"), false);
  assert.equal(ug.isLikelyValid?.(""), false);
});

test("extracts metadata and raw content from a chords page", () => {
  const html = pageWith({
    tab: {
      song_name: "Above All",
      artist_name: "Michael W. Smith",
      tonality: "G",
      capo: 0,
      type_name: "Chords",
    },
    tab_view: {
      wiki_tab: {
        content: "[Verse 1]\n[tab][ch]G[/ch] [ch]C[/ch]\nAbove all powers[/tab]",
      },
    },
  });

  const { metadata, rawContent } = ug.parse(html, "https://tabs.ultimate-guitar.com/x");
  assert.equal(metadata.title, "Above All");
  assert.equal(metadata.artist, "Michael W. Smith");
  assert.equal(metadata.key, "G"); // captured but unused in v1
  assert.equal(metadata.capo, 0);
  assert.equal(metadata.language, "English");
  assert.ok(rawContent.includes("[ch]G[/ch]"));

  // End-to-end through the formatter, as the plugin pipeline does.
  assert.equal(formatChordBlock(rawContent), "[Verse 1]\nG C\nAbove all powers");
});

test("survives apostrophes and ampersands in the escaped JSON", () => {
  const html = pageWith({
    tab: { song_name: "O' Praise & Worship", artist_name: "A & B", type_name: "Chords" },
    tab_view: { wiki_tab: { content: "[Intro]\n[ch]C[/ch]" } },
  });
  const { metadata } = ug.parse(html, "u");
  assert.equal(metadata.title, "O' Praise & Worship");
  assert.equal(metadata.artist, "A & B");
});

test("throws a clear error for Official/Pro tabs (no wiki_tab content)", () => {
  const html = pageWith({
    tab: { song_name: "Some Song", artist_name: "Band", type_name: "Official" },
    tab_view: {},
  });
  assert.throws(
    () => ug.parse(html, "u"),
    /Official\/Pro tabs|standard Chords page|importable chord text/
  );
});

test("throws when the js-store div is absent (format drift)", () => {
  assert.throws(
    () => ug.parse("<html><body>no store here</body></html>", "u"),
    /data store|format may have changed/
  );
});

test("throws when data-content is present but not valid JSON", () => {
  const html = `<div class="js-store" data-content="${htmlEscape("{not json")}"></div>`;
  assert.throws(() => ug.parse(html, "u"), /invalid JSON|parse/);
});

test("parses the checked-in static fixture and produces a vault-shaped block", () => {
  // Demonstrates the file-based fixture pattern (see tests/fixtures/README.md).
  // Tests run transpiled from tests/.tmp/, so fixtures live one level up.
  const html = readFileSync(path.join(here, "..", "fixtures", "synthetic-ug-chords.html"), "utf8");
  const { metadata, rawContent } = ug.parse(html, "https://tabs.ultimate-guitar.com/x");
  assert.equal(metadata.title, "Test Worship Song");
  assert.equal(metadata.artist, "Fixture Artist");

  const block = formatChordBlock(rawContent);
  // Every section header must be bracketed (the chord-sheets plugin requires it).
  for (const line of block.split("\n")) {
    if (/^(verse|chorus|bridge|intro)\b/i.test(line.trim())) {
      assert.fail(`Unbracketed header leaked through: ${JSON.stringify(line)}`);
    }
  }
  assert.ok(block.includes("[Verse 1]"));
  assert.ok(block.includes("[Chorus]"));
});
