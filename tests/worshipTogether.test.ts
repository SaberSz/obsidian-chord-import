import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { worshipTogetherAdapter as wt } from "../src/adapters/worshipTogether";
import { findAdapter } from "../src/adapters";
import { formatChordBlock } from "../src/formatter";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = () =>
  readFileSync(path.join(here, "..", "fixtures", "worshiptogether-synthetic.html"), "utf8");

test("routes worshiptogether.com URLs to the WT adapter", () => {
  assert.equal(findAdapter("https://www.worshiptogether.com/songs/x/")?.id, "worship-together");
  assert.ok(wt.matches("https://www.worshiptogether.com/songs/x/"));
  assert.ok(!wt.matches("https://tabs.ultimate-guitar.com/tab/x"));
  // scheme + real-hostname validation
  assert.ok(!wt.matches("file:///etc/passwd#worshiptogether.com"));
  assert.ok(!wt.matches("http://169.254.169.254/?x=worshiptogether.com"));
  assert.ok(!wt.matches("https://worshiptogether.com.attacker.test/x"));
});

test("isLikelyValid detects the chord chart container", () => {
  assert.equal(wt.isLikelyValid?.(fixture()), true);
  assert.equal(wt.isLikelyValid?.("<html>Just a moment…</html>"), false);
});

test("extracts metadata from og:title and data-original-key", () => {
  const { metadata } = wt.parse(fixture(), "u");
  assert.equal(metadata.title, "Test Song");
  assert.equal(metadata.artist, "Test Artist");
  assert.equal(metadata.key, "G"); // captured, unused in v1
  assert.equal(metadata.language, "English");
});

test("renders positional chord-over-lyric text with bracketed headers", () => {
  const { rawContent } = wt.parse(fixture(), "u");
  const block = formatChordBlock(rawContent);

  // Headers bracketed by the shared formatter.
  assert.ok(block.includes("[Verse 1]"));
  assert.ok(block.includes("[Chorus]"));

  // Chord sits exactly over the lyric column it belongs to:
  // "C" starts at column 18 ("Amazing grace how " is 18 chars).
  const chordLine = "G" + " ".repeat(17) + "C";
  assert.ok(
    block.includes(`${chordLine}\nAmazing grace how sweet the sound`),
    "chord/lyric alignment not preserved"
  );

  // HTML entities decoded (& and ').
  assert.ok(block.includes("Praise & honor it's great"));

  // Adapter inserts a blank line before a section header.
  assert.ok(/sweet the sound\n\n\[Chorus\]/.test(block), "expected a blank line before [Chorus]");
});
