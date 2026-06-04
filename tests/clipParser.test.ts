import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseClip, splitClipTitle, stripJunkLines } from "../src/clipParser";
import { formatChordBlock } from "../src/formatter";

const here = path.dirname(fileURLToPath(import.meta.url));

test('splitClipTitle parses "Artist - Song (Chords)"', () => {
  assert.deepEqual(splitClipTitle("Test Artist - Test Song (Chords)"), {
    artist: "Test Artist",
    title: "Test Song",
  });
  // No artist separator -> whole thing is the title.
  assert.deepEqual(splitClipTitle("Some Song (Tab)"), { title: "Some Song" });
  // Hyphen inside the song title shouldn't break it (split on first " - ").
  assert.deepEqual(splitClipTitle("Band - Best - Song (Ukulele)"), {
    artist: "Band",
    title: "Best - Song",
  });
});

test("stripJunkLines removes injected ad/script lines but keeps chords", () => {
  const input =
    "       C            G\n" +
    "La la la la la la la\n" +
    "5 Best Guitar Amps   var config = window.configPlayer; function applyFlowStyle() {}\n" +
    "       Am           F\n" +
    "Na na na na na na na";
  const out = stripJunkLines(input);
  assert.ok(!/configPlayer|var |function\s*\(/.test(out));
  assert.ok(out.includes("La la la la la la la"));
  assert.ok(out.includes("       C            G")); // alignment untouched
});

test("parseClip on a Web Clipper export: metadata + clean aligned chart", () => {
  const clip = readFileSync(path.join(here, "..", "fixtures", "webclip-synthetic.md"), "utf8");
  const { metadata, rawContent } = parseClip(clip);

  assert.equal(metadata.title, "Test Clip Song");
  assert.equal(metadata.artist, "Test Artist");
  assert.equal(metadata.language, "English");

  const block = formatChordBlock(rawContent);

  // The ad/JS blob is gone.
  assert.ok(!/configPlayer|var config|function\s*\(|Guitar Amps/.test(block), "junk leaked through");
  // No absurdly long lines survived (the JS blob was one long line).
  assert.ok(block.split("\n").every((l) => l.length <= 120), "an over-long line survived");

  // Structure intact: Verse 1/2 and a Chorus header.
  assert.ok(block.startsWith("[Verse 1]"));
  assert.ok(block.includes("[Verse 2]") && block.includes("[Chorus]"));

  // Positional alignment preserved (chord line sits exactly over the lyric).
  assert.ok(block.includes("       C            G\nLa la la la la la la"));

  // Junk removal didn't leave a gap before the Chorus header.
  assert.ok(/Na na na na na na na\n\n\[Chorus\]/.test(block), "expected a single blank line before [Chorus]");
});
