import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatChordBlock,
  normalizeHeaderLine,
  wrapChordsFence,
} from "../src/formatter";

test("strips [ch]/[tab] markers while preserving positional alignment", () => {
  // The canonical example from docs/ULTIMATE-GUITAR.md.
  const raw =
    "[Verse 1]\n" +
    "[tab][ch]G[/ch]           [ch]C[/ch]       [ch]D[/ch]         [ch]G[/ch]\n" +
    "Above all powers, Above all Kings[/tab]";

  const expected =
    "[Verse 1]\n" +
    "G           C       D         G\n" +
    "Above all powers, Above all Kings";

  assert.equal(formatChordBlock(raw), expected);
});

test("normalizes CRLF line endings to LF", () => {
  const raw = "[Verse]\r\n[ch]G[/ch] [ch]C[/ch]\r\nlyrics here";
  assert.equal(formatChordBlock(raw), "[Verse]\nG C\nlyrics here");
});

test("collapses 3+ blank lines to a single blank line and trims edges", () => {
  const raw = "\n\n[Verse]\nword\n\n\n\n[Chorus]\nword\n\n";
  assert.equal(formatChordBlock(raw), "[Verse]\nword\n\n[Chorus]\nword");
});

test("leaves already-bracketed headers untouched", () => {
  assert.equal(normalizeHeaderLine("[Verse 1]"), null);
  assert.equal(normalizeHeaderLine("[Chorus]"), null);
});

test("brackets and title-cases plain section headers", () => {
  assert.equal(normalizeHeaderLine("VERSE 1"), "[Verse 1]");
  assert.equal(normalizeHeaderLine("chorus"), "[Chorus]");
  assert.equal(normalizeHeaderLine("Chorus:"), "[Chorus]");
  assert.equal(normalizeHeaderLine("Verse2"), "[Verse 2]");
  assert.equal(normalizeHeaderLine("pre-chorus"), "[Pre-Chorus]");
  assert.equal(normalizeHeaderLine("PRE CHORUS"), "[Pre Chorus]");
});

test("splits a header line that also carries chords", () => {
  // "INTRO: Dm Bb C" -> "[Intro]" then the chord line.
  assert.equal(normalizeHeaderLine("INTRO: Dm Bb C"), "[Intro]\nDm Bb C");
  assert.equal(normalizeHeaderLine("Intro  G D Em C"), "[Intro]\nG D Em C");
});

test("a header line followed by lyric words (not chords) is just a header", () => {
  // "Bridge to the chorus" is prose, not "Bridge" + chords — but the keyword
  // anchors at start, so it normalizes the whole line as a label. We only assert
  // the documented behavior: lines whose tail is NOT chords don't get split.
  const out = normalizeHeaderLine("Verse one and a half");
  assert.ok(out !== null && !out.includes("\n"));
});

test("does not treat ordinary lyric lines as headers", () => {
  assert.equal(normalizeHeaderLine("Above all powers, Above all Kings"), null);
  assert.equal(normalizeHeaderLine("You were here before the world began"), null);
});

test("preserves slash chords and their alignment spaces", () => {
  const raw = "[ch]Am[/ch]              [ch]Am/G[/ch]           [ch]D/F#[/ch]    [ch]G[/ch]";
  assert.equal(formatChordBlock(raw), "Am              Am/G           D/F#    G");
});

test("full multi-section conversion matches vault shape", () => {
  const raw =
    "INTRO: [ch]Dm[/ch] [ch]Bb[/ch] [ch]C[/ch]\r\n" +
    "verse 1\r\n" +
    "[tab][ch]G[/ch]           [ch]C[/ch]\r\n" +
    "Above all powers[/tab]\r\n" +
    "CHORUS:\r\n" +
    "[ch]G[/ch]     [ch]Am[/ch]\r\n" +
    "Crucified";

  const expected =
    "[Intro]\n" +
    "Dm Bb C\n" +
    "[Verse 1]\n" +
    "G           C\n" +
    "Above all powers\n" +
    "[Chorus]\n" +
    "G     Am\n" +
    "Crucified";

  assert.equal(formatChordBlock(raw), expected);
});

test("wrapChordsFence matches the template's leading-blank-line shape", () => {
  assert.equal(wrapChordsFence("[Verse]\nword"), "```chords\n\n[Verse]\nword\n```");
});

test("wrapChordsFence grows the fence so body backticks can't break out", () => {
  // Untrusted body containing a ``` run must not be able to close the fence.
  const body = "[Verse]\n```\n<img src=x onerror=alert(1)>\n```";
  const wrapped = wrapChordsFence(body);
  assert.ok(wrapped.startsWith("````chords\n"), "fence should be 4+ backticks");
  assert.ok(wrapped.endsWith("\n````"));
  // The injected content stays inside the block (block isn't closed early).
  assert.equal((wrapped.match(/^````chords$/gm) ?? []).length, 1);
});
