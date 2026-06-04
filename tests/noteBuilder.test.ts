import { test } from "node:test";
import assert from "node:assert/strict";
import { buildNoteContent, applyFilenameTemplate } from "../src/noteBuilder";

const TEMPLATE =
  `---\nLanguage: English\nTempo:\nSignature: 4/4\nStyle:\nSpeed: Slow\ntags:\nArtist:\n---\n` +
  "```chords\n\nLyrics and chords\n```\n";

test("YAML-escapes a malicious artist (no frontmatter injection)", () => {
  const evil = "Foo\nmalicious_key: pwned\n---\n# injected body";
  const out = buildNoteContent(
    TEMPLATE,
    { title: "X", artist: evil, language: "English" },
    "```chords\n\n[Verse]\nx\n```"
  );
  // Artist is a single quoted scalar on one line.
  assert.ok(/^Artist: ".*"$/m.test(out), "artist not a quoted single-line scalar");
  // No injected key or body heading on its own line (it stays inside the quoted scalar).
  assert.ok(!/^malicious_key:/m.test(out));
  assert.ok(!/^# injected body/m.test(out));
  // Exactly one frontmatter fence pair survived (the injected --- is inside quotes, mid-line).
  assert.equal((out.match(/^---$/gm) ?? []).length, 2);
});

test("a $ in untrusted artist isn't treated as a replacement pattern", () => {
  const out = buildNoteContent(TEMPLATE, { title: "X", artist: "AC$&DC", language: "English" }, "BLOCK");
  assert.ok(out.includes('Artist: "AC$&DC"'));
});

test("applyFilenameTemplate blocks traversal, dotfiles, and reserved names", () => {
  // Path separators stripped → can't traverse out of the target folder.
  const traversal = applyFilenameTemplate("{{title}}", { title: "../../etc/passwd" });
  assert.ok(!traversal.includes("/") && !traversal.includes("\\"));
  assert.equal(traversal, "etcpasswd");
  // Leading dots removed → no hidden/dot files.
  assert.equal(applyFilenameTemplate("{{title}}", { title: ".hidden" }), "hidden");
  // Windows reserved name guarded.
  assert.equal(applyFilenameTemplate("{{title}}", { title: "CON" }), "_CON");
  // Empty-after-sanitize falls back.
  assert.equal(applyFilenameTemplate("{{title}}", { title: "///" }), "Untitled");
});
