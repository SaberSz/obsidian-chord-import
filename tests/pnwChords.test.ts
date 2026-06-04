import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pnwChordsAdapter as pnw } from "../src/adapters/pnwchords";
import { findAdapter } from "../src/adapters";
import { formatChordBlock } from "../src/formatter";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = () => readFileSync(path.join(here, "..", "fixtures", "pnwchords-synthetic.html"), "utf8");

test("routes pnwchords.com URLs; validates scheme + host", () => {
  assert.equal(findAdapter("https://pnwchords.com/some-song/")?.id, "pnwchords");
  assert.ok(pnw.matches("https://pnwchords.com/x/"));
  assert.ok(!pnw.matches("https://www.worshiptogether.com/songs/x"));
  assert.ok(!pnw.matches("file:///etc/passwd#pnwchords.com"));
  assert.ok(!pnw.matches("https://pnwchords.com.attacker.test/x"));
});

test("isLikelyValid detects the <pre> chart block", () => {
  assert.equal(pnw.isLikelyValid?.(fixture()), true);
  assert.equal(pnw.isLikelyValid?.("<html><body>no chart here</body></html>"), false);
});

test("parses title/artist from og:title (strips ' Chords')", () => {
  const { metadata } = pnw.parse(fixture(), "u");
  assert.equal(metadata.title, "Test Song");
  assert.equal(metadata.artist, "Test Artist");
  assert.equal(metadata.language, "English");
});

test("extracts the <pre> chart: alignment, bracketed headers, decoded entities", () => {
  const { rawContent } = pnw.parse(fixture(), "u");
  const block = formatChordBlock(rawContent);

  assert.ok(block.startsWith("[Verse 1]"));
  assert.ok(block.includes("[Chorus]"));
  // Positional chord-over-lyric alignment preserved verbatim from the <pre>.
  assert.ok(block.includes("C            G\nLa la la la la"), "alignment not preserved");
  // HTML entity decoded.
  assert.ok(block.includes("Na na & na na na"), "entity not decoded");
});
