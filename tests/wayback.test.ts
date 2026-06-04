import { test } from "node:test";
import assert from "node:assert/strict";
import { availabilityUrl, toRawSnapshotUrl } from "../src/wayback";

test("availabilityUrl encodes the target URL", () => {
  const u = availabilityUrl("https://tabs.ultimate-guitar.com/tab/x?y=1&z=2");
  assert.ok(u.startsWith("https://archive.org/wayback/available?url="));
  assert.ok(u.includes("https%3A%2F%2Ftabs.ultimate-guitar.com%2Ftab%2Fx%3Fy%3D1%26z%3D2"));
});

test("toRawSnapshotUrl inserts id_ and forces https", () => {
  assert.equal(
    toRawSnapshotUrl("http://web.archive.org/web/20230101000000/https://site/x"),
    "https://web.archive.org/web/20230101000000id_/https://site/x"
  );
});

test("toRawSnapshotUrl replaces an existing rewrite modifier with id_", () => {
  // A snapshot URL that already carries the page-render modifier (im_/if_/id_).
  assert.equal(
    toRawSnapshotUrl("https://web.archive.org/web/20230101000000if_/https://site/x"),
    "https://web.archive.org/web/20230101000000id_/https://site/x"
  );
  assert.equal(
    toRawSnapshotUrl("https://web.archive.org/web/20230101000000id_/https://site/x"),
    "https://web.archive.org/web/20230101000000id_/https://site/x"
  );
});
