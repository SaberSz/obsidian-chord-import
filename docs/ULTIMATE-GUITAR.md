# Ultimate Guitar: format & conversion

How v1 gets chords/lyrics out of an Ultimate Guitar chord page and converts them to the vault's format.

> ⚠️ UG has no public API and changes its markup periodically. All UG-specific assumptions below are isolated in `src/adapters/ultimateGuitar.ts` and pinned by HTML fixtures in `tests/fixtures/`. When UG changes, a fixture test fails and only the adapter needs updating.

## Where the data lives

A UG chord page is server-rendered with a JSON store embedded in the HTML:

```html
<div class="js-store" data-content="{&quot;store&quot;:{&quot;page&quot;:{ ... }}}"></div>
```

- The `data-content` attribute value is **HTML-entity-escaped JSON**. Read the attribute, unescape entities (`&quot;` → `"`, `&amp;` → `&`, etc.), then `JSON.parse`.
- Robust extraction: locate the `js-store` element (regex on the attribute or a DOM parse via `DOMParser`, available in Obsidian's renderer). Prefer a tolerant approach — don't assume attribute order.

## Fields to read

From the parsed object (paths may drift; verify against a fixture):

| Vault field | UG path |
|---|---|
| title | `store.page.data.tab.song_name` |
| artist | `store.page.data.tab.artist_name` |
| chord/lyric body | `store.page.data.tab_view.wiki_tab.content` |
| key (captured, **unused** v1) | `store.page.data.tab.tonality` |
| capo (captured, **unused** v1) | `store.page.data.tab.capo` |

`store.page.data.tab.type` / `type_name` indicates the page kind ("Chords", "Tabs", "Official", "Pro", "Bass", …).

## The content format

`wiki_tab.content` is plain text with UG's markup:

- Chords are wrapped inline: `[ch]G[/ch]`, `[ch]D/F#[/ch]`.
- Blocks are wrapped: `[tab]…[/tab]` (usually around a chord-line + lyric-line pair).
- Section labels appear as text lines, frequently already bracketed: `[Verse 1]`, `[Chorus]` — but sometimes plain or uppercased.

Example raw `content`:

```
[Verse 1]
[tab][ch]G[/ch]           [ch]C[/ch]       [ch]D[/ch]         [ch]G[/ch]
Above all powers, Above all Kings[/tab]
```

## Conversion algorithm (→ vault ` ```chords ` body)

1. **Strip block markers:** remove literal `[tab]` and `[/tab]` (keep the lines they wrapped).
2. **Strip chord markers:** remove literal `[ch]` and `[/ch]`. **Critical:** these are inserted immediately around each chord token without altering the spaces *between* tokens, so removing them leaves the original column alignment intact. Do not trim or collapse whitespace.
3. **Normalize section headers:** for each line, if it's a section label (`Verse`/`Chorus`/`Bridge`/`Intro`/`Pre-Chorus`/`Coda`/`Outro`/`Tag`/`Interlude`/`Refrain`/`Ending`/`Instrumental`/`Vamp`/`Hook`, optionally numbered/qualified), output it bracketed and title-cased: `[Verse 1]`, `[Chorus]`. If a label line also carries chords (`INTRO: Dm Bb C`), split into `[Intro]` then the chord line. (Same normalizer the vault cleanup used.)
4. **Line endings:** UG uses `\r\n`; normalize to `\n`.
5. Result is the block body; `noteBuilder` wraps it in a ` ```chords ` fence with a leading blank line (matching the template).

The transform after steps 1–2 on the example yields exactly:

```
[Verse 1]
G           C       D         G
Above all powers, Above all Kings
```

## Edge cases & failure modes

- **Official / Pro tabs:** these are an interactive proprietary format — `wiki_tab.content` is absent/empty. Detect via `tab.type`/missing content and throw a clear "This is an Official/Pro tab, which has no importable chord text — use a standard Chords page" error. **Do not** produce an empty note.
- **UG blocking / non-200:** likely needs a realistic `User-Agent`; surface a retry-able error.
- **Structure drift:** if `js-store` or the expected paths are missing, fail loudly with "couldn't parse UG page (format may have changed)" rather than writing garbage.
- **Capo / "transpose +N" notes** sometimes appear as free text in `content`; keep them as-is in the block (the user handles key manually).
- **URL forms:** accept `https://tabs.ultimate-guitar.com/tab/...` and `https://www.ultimate-guitar.com/...`; route by hostname containing `ultimate-guitar.com`.
