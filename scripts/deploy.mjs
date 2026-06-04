/*
 * Copies the built artifacts (main.js, manifest.json, styles.css) into an
 * Obsidian vault's plugin folder for local testing. Run after a build:
 *   VAULT=/path/to/vault npm run deploy
 * The vault path comes from the VAULT env var, or a gitignored .vault-path file.
 * Never copies source or node_modules.
 */
import { copyFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";

const VAULT =
  process.env.VAULT ||
  (existsSync(".vault-path") ? readFileSync(".vault-path", "utf8").trim() : "");

if (!VAULT) {
  console.error(
    "No vault path set. Use `VAULT=/path/to/vault npm run deploy`,\n" +
      "or create a .vault-path file (gitignored) containing the vault path."
  );
  process.exit(1);
}

if (!existsSync(path.join(VAULT, ".obsidian"))) {
  console.error(`No .obsidian folder found at:\n  ${VAULT}\nIs VAULT pointing at an Obsidian vault?`);
  process.exit(1);
}

const dest = path.join(VAULT, ".obsidian", "plugins", "obsidian-chord-import");
mkdirSync(dest, { recursive: true });
for (const f of ["main.js", "manifest.json", "styles.css"]) {
  copyFileSync(f, path.join(dest, f));
  console.log(`copied ${f}`);
}
console.log(`\nDeployed to ${dest}`);
console.log("Reload Obsidian (or toggle the plugin off/on) to pick up changes.");
