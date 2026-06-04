# Roadmap

## v1 — Ultimate Guitar (current target)

**Milestones**
1. ✅ **Scaffold builds & loads** — `npm run build` produces `main.js` (tsc typecheck + esbuild). Command/modal wired in `main.ts`.
2. ✅ **Formatter** — `formatter.ts` (marker stripping + header normalizer) implemented and covered by unit tests in `tests/formatter.test.ts`. Source-agnostic; no network.
3. ✅ **UG adapter** — `ultimateGuitar.ts` extracts metadata + content; covered by `tests/ultimateGuitar.test.ts` (synthetic + checked-in static fixture, plus error paths). *Still want real captured UG pages as fixtures.*
4. ✅ **Note builder + settings** — template fill, path resolution, settings tab implemented.
5. ✅ **Duplicate modal** — Open/Rename/Overwrite + default-behavior setting implemented.
6. ✅ **End-to-end** — paste a real UG URL → note created in the target folder. Verified on desktop and mobile.

**Definition of done (v1):** pasting a standard UG Chords URL creates a correctly aligned, bracketed-header note with `Artist` filled and other judgment fields left for review; Official/Pro tabs and parse failures show clear errors; duplicates prompt the modal.

## Later

- **More adapters** (priority order TBD with the user): ✅ Worship Together (`src/adapters/worshipTogether.ts`, renders its chord-pro DOM to positional text). ✅ pnwchords.com (`src/adapters/pnwchords.ts`, single plain-text `<pre>` chart). Both not Cloudflare-gated. Remaining candidates: e-chords/Chordie. PraiseCharts is paywalled (purchased PDFs) — likely out of reach.
- **Paste-raw-text fallback:** reuse the formatter on clipboard text with no URL — covers the Malayalam/Hindi/Kannada long tail that isn't on mainstream sites. The architecture already supports this (formatter is source-agnostic).
- **Smart tag suggestions:** propose theme tags from the controlled vocabulary based on lyrics (for review, never auto-applied).
- **Re-import / refresh** an existing song.

## Open questions

- Filename sanitization rules for titles with `/`, `:`, etc. — confirm desired behavior with real song names.
- Should `Language` be auto-set to English for UG imports, or always left blank? (Most UG songs are English.)
- Minimum Obsidian version to target in `manifest.json` (currently a conservative guess).
