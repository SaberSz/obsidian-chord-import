# Releasing

This plugin is distributed **privately via GitHub Releases + [BRAT](https://github.com/TfTHacker/obsidian42-brat)** — not the official community store. A release bundles the built artifacts (`main.js`, `manifest.json`, `styles.css`); BRAT pulls them onto each device and auto-updates.

- Repo: `SaberSz/obsidian-chord-import`
- Git remote name here is **`obsidian-chord-import`** (not `origin`).
- Prereq: `gh` (GitHub CLI) installed and authed as `SaberSz` (`gh auth login`).
- The release **tag must equal the `manifest.json` version, with no `v` prefix** (e.g. `0.1.0`) — that's how BRAT/Obsidian match it.
- `main.js` is gitignored; the Release is the only place the built binary ships.

## Cut a release

1. Bump the version:
   - `manifest.json` → `version`
   - `versions.json` → add `"<version>": "<minAppVersion>"` (the minimum Obsidian version)
   - Commit it.
2. Build, tag, push the tag, create the release with assets:

   ```bash
   npm run build
   VERSION=$(node -p "require('./manifest.json').version")
   git tag -a "$VERSION" -m "Chord Import $VERSION"
   git push obsidian-chord-import "$VERSION"
   gh release create "$VERSION" main.js manifest.json styles.css \
     --repo SaberSz/obsidian-chord-import \
     --title "$VERSION" \
     --notes "What changed in this version…"
   ```

3. Verify the assets attached:

   ```bash
   gh release view "$VERSION" --repo SaberSz/obsidian-chord-import \
     --json tagName,assets --jq '{tag: .tagName, assets: [.assets[].name]}'
   ```

## Install / update on a device (iPhone, iPad, desktop)

First time:
1. Community plugins → **Browse** → install & enable **BRAT** (by TfTHacker).
2. **Settings → BRAT → Add beta plugin** → `https://github.com/SaberSz/obsidian-chord-import` → Add.
3. Community plugins → enable **Chord Import**.

After a new release: BRAT auto-updates, or **Settings → BRAT → Check for updates**.

## Notes

- Desktop development install is separate: `npm run deploy` copies the build straight into the local vault's plugin folder (see `scripts/deploy.mjs`). Use that for local testing; use a Release for the phone/iPad.
- The official community store would require a public submission/review PR to `obsidianmd/obsidian-releases`; not used here (personal plugin).
