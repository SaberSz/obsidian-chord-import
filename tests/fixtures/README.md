# Test fixtures

Drop **real saved HTML pages** here (e.g. `above-all.html`) and write parser tests that run the adapter + formatter against them. This pins Ultimate Guitar's structure: when UG changes its markup, a fixture test fails and only `src/adapters/ultimateGuitar.ts` needs updating — no live network in tests.

Suggested coverage:
- a simple single-section chords page
- a multi-section song with a capo / "transpose" note
- a page whose section labels are plain/uppercased (exercises the header normalizer)
- an **Official/Pro tab** page (assert the adapter throws the clear "unsupported page" error)

How to capture: open a UG chord page, View Source, save as `<slug>.html`. (Do not commit anything you're not comfortable redistributing; these are for local testing.)
