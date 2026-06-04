# Obsidian Chord Import

An [Obsidian](https://obsidian.md) plugin that imports a song from a chord website and creates a formatted chord-chart note — chords aligned over the lyrics, bracketed `[Section]` headers, and auto-filled metadata — ready for a chord-rendering plugin to display.

## Features

- **Import from URL** — paste an **Ultimate Guitar** or **Worship Together** song URL; the plugin fetches the page, extracts the chords/lyrics and metadata, and writes a formatted note. For sites behind a bot check, it falls back through a layered fetch: direct request → Wayback Machine snapshot → an in-app browser view (desktop) that clears the check and reads the page.
- **Import from clipped page** — paste a page captured with [Obsidian Web Clipper](https://github.com/obsidianmd/obsidian-clipper); it detects title/artist and the chord chart and strips page junk. Works on mobile.
- **Import from pasted text** — paste a chord chart manually and set the title/artist.
- **Source-agnostic formatter** — strips site markup, preserves positional chord alignment (never reflows), and normalizes section headers to bracketed form.
- **Duplicate handling** — Open existing / Save renamed / Overwrite, with a configurable default.
- Auto-fills what it can (title, artist) and leaves judgment fields (tempo/style/tags) for review. Key/transpose is intentionally left manual.

## Install (via BRAT)

This plugin isn't in the community store. Install it with [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. Install and enable **BRAT** from Community plugins.
2. BRAT → **Add beta plugin** → `https://github.com/SaberSz/obsidian-chord-import`
3. Enable **Chord Import** in Community plugins.

Works on desktop and mobile (`isDesktopOnly: false`). The URL fetch's browser-render fallback is desktop-only; on mobile use the clipped-page or pasted-text import.

## Usage

Open the command palette and run one of:

- **Import song from URL**
- **Import song from clipped page**
- **Import song from pasted text**

Notes are created in the target folder (default `Music Chords`) from a template. Settings let you configure the target folder, template path, filename pattern, duplicate behavior, User-Agent, and the fetch fallbacks.

## Adding a source

Each site is a small adapter in `src/adapters/` implementing `SiteAdapter` (match a hostname, parse HTML → metadata + raw chord text). The formatter, note builder, modals, and fetch chain are all reused — adding a site is a new file plus one entry in `src/adapters/index.ts`.

See [`docs/`](docs/) for the architecture (`PLAN.md`), the Ultimate Guitar format (`ULTIMATE-GUITAR.md`), and the roadmap.

## Development

Requires Node.js 18+.

```bash
npm install
npm run dev      # esbuild watch → main.js
npm run build    # typecheck + production build
npm test         # offline parser/formatter tests
```

For local testing, copy the build into a vault's plugin folder:

```bash
VAULT=/path/to/your/vault npm run deploy
```

Releases are cut via GitHub Releases (see [`RELEASING.md`](RELEASING.md)); BRAT installs and updates from them.

## License

MIT
