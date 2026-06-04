/*
 * Transpiles scripts/try-import.ts (and the src/ modules it imports) with
 * esbuild, then runs it — so the harness exercises the real plugin logic.
 * `obsidian`/`electron`/builtins are external; the code paths we run never call
 * into the Obsidian runtime (only types), so this works in plain Node.
 *
 *   node scripts/import-url.mjs <saved-page.html> [original-url]
 */
import esbuild from "esbuild";
import builtins from "builtin-modules";

// noteBuilder.ts imports a couple of symbols from "obsidian" at module top, but
// the functions we actually call here (buildNoteContent / applyFilenameTemplate)
// never touch the Obsidian runtime. Stub the module so the bundle links.
const obsidianStub = {
  name: "obsidian-stub",
  setup(build) {
    build.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "stub" }));
    build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      contents: "export class TFile {} export function normalizePath(p){return p}",
      loader: "js",
    }));
  },
};

const result = await esbuild.build({
  entryPoints: ["scripts/try-import.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  target: "node20",
  external: ["electron", ...builtins],
  plugins: [obsidianStub],
  logLevel: "warning",
});

const code = result.outputFiles[0].text;
await import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
