# Architecture & v1 Spec

## Goal

Command **"Import song from URL"** → paste an Ultimate Guitar chord URL → a new, conventionally formatted note appears in the vault's `Music Chords/` folder, with chords/lyrics and auto-filled metadata. Duplicate names prompt a modal.

## Pipeline

```
URL ──▶ fetcher ──▶ adapter (UG) ──▶ formatter ──▶ noteBuilder ──▶ vault note
                       │                                  ▲
                       └── metadata ─────────────────────┘
                                                   duplicateModal (if name clash)
```

### 1. Fetcher (`src/fetcher.ts`)
- Use Obsidian's `requestUrl({ url, headers })` — **not** `fetch` (CORS) and not Node `http` (must work on mobile).
- Send a realistic desktop `User-Agent`; UG may serve different markup or block obvious bots. Make the UA a setting with a sane default.
- Return the raw HTML string. Surface network/non-200 errors to the modal.

### 2. Adapter (`src/adapters/ultimateGuitar.ts`)
UG embeds all song data as escaped JSON in a `<div class="js-store" data-content="…">`. Steps (full detail in `ULTIMATE-GUITAR.md`):
1. Locate the `js-store` div, read `data-content`, HTML-unescape, `JSON.parse`.
2. Read:
   - `store.page.data.tab.song_name` → title
   - `store.page.data.tab.artist_name` → artist
   - `store.page.data.tab_view.wiki_tab.content` → raw chord/lyric text (the `[ch]`/`[tab]` format)
   - (`tab.tonality`, `tab.capo` exist — captured but **unused** in v1)
3. Detect unsupported pages (Official/Pro tabs have no `wiki_tab.content`) → throw a clear, user-facing error.
4. Return `{ metadata, rawContent }` (see `types.ts`).

Adapters implement a common interface and are registered in `adapters/index.ts`, routed by hostname. Adding a site = new file + one registry entry.

### 3. Formatter (`src/formatter.ts`) — source-agnostic
Turns raw chord text into the vault's ` ```chords ` block body:
- Strip the literal markers `[ch]`, `[/ch]`, `[tab]`, `[/tab]` — **inter-chord spacing is preserved**, so positional alignment comes out correct. Never reflow chord lines.
- Normalize section headers to bracketed form (`Verse 1` / `VERSE`/ `Chorus:` → `[Verse 1]` / `[Chorus]`). If a header line carries chords (`INTRO: Dm Bb C`), split: `[Intro]` on its own line, chords on the next.
- Return the block body; the caller wraps it in a ` ```chords … ``` ` fence.

### 4. Note builder (`src/noteBuilder.ts`)
- Load the vault's `Templates/Chords Template.md` (path configurable; fallback to a built-in copy).
- Fill frontmatter: `Artist` (and any other derivable field). Leave `Speed` at the template default and `Style`/`tags`/`Tempo` blank for review. Do **not** invent values.
- Insert the chords block in place of the template's placeholder.
- Compute target path: `<targetFolder>/<filename>.md` using the filename template (default: the song title, sanitized for filesystem-illegal chars).

### 5. Duplicate resolution (`src/modals/duplicateModal.ts`)
If the target file exists, show a modal:
- **Open existing** — abort import, open the existing note.
- **Save as renamed** — append a suffix (e.g. ` (2)`) or let the user edit the name.
- **Overwrite** — replace contents.
A setting holds the default action so power users can skip the prompt.

## Settings (`src/settings.ts`)
- `targetFolder` (default `Music Chords`)
- `templatePath` (default `Templates/Chords Template.md`)
- `filenameTemplate` (default `{{title}}`)
- `duplicateBehavior` (`ask` | `rename` | `overwrite`, default `ask`)
- `userAgent` (default a current desktop Chrome UA)

## Error handling (user-facing, via Notice/modal)
- Invalid/unreachable URL
- Unsupported page type (Pro/Official tab, non-chord page)
- Parse failure (UG changed structure) → suggest reporting/updating the adapter
- Empty content

## Testing
- Fixture-based: real UG pages saved under `tests/fixtures/<slug>.html`; assert the adapter+formatter produce the expected ` ```chords ` block and metadata. No network in tests.
- Keep a couple of fixtures spanning variety (simple song, capo, transpose note, multi-section, an Official-tab page to assert the graceful error).

## Non-goals (v1)
- Key detection / transpose
- Sites other than Ultimate Guitar
- Editing/refreshing an already-imported song
- Bulk import
