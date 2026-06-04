/*
 * Transpiles tests/*.test.ts (and the src/ modules they import) into runnable
 * ESM under tests/.tmp/ so `node --test` can execute them. Node 20 can't run
 * TypeScript directly. The code under test never calls the Obsidian runtime, but
 * some modules import a few symbols from "obsidian" at module top — so we stub
 * that module (rather than externalize it, which would fail to resolve in Node).
 */
import esbuild from "esbuild";
import builtins from "builtin-modules";
import { readdirSync, rmSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Minimal stand-in for the "obsidian" module so test bundles resolve in Node.
const obsidianStub = {
  name: "obsidian-stub",
  setup(build) {
    build.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "obstub" }));
    build.onLoad({ filter: /.*/, namespace: "obstub" }, () => ({
      contents:
        "export class TFile {} export class Modal {} export class Setting {} " +
        "export class Notice {} export class Plugin {} export class PluginSettingTab {} " +
        "export const Platform = { isDesktopApp: true }; " +
        "export function normalizePath(p){return p} " +
        "export function requestUrl(){ throw new Error('requestUrl unavailable in tests') }",
      loader: "js",
    }));
  },
};

const here = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.join(here, ".tmp");

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

const entryPoints = readdirSync(here)
  .filter((f) => f.endsWith(".test.ts"))
  .map((f) => path.join(here, f));

if (entryPoints.length === 0) {
  console.error("No *.test.ts files found in tests/.");
  process.exit(1);
}

await esbuild.build({
  entryPoints,
  outdir,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outExtension: { ".js": ".mjs" },
  external: ["electron", ...builtins],
  plugins: [obsidianStub],
  logLevel: "warning",
});
