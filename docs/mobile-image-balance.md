# Mobile image balance — 7.11.2026

Root cause: home has TWO category presentations. The first is HomeSearchHero's
horizontal shortcut strip: min-width 110px, 8px padding, 1px borders, image h-20.
This produces exactly 92×80px image boxes. Increasing the lower category grid
in the previous PR did not increase these first visible shortcuts.

Now the first six shortcuts form a real two-column mobile grid with square,
full-width, absolutely positioned contain images (no shrink-to-intrinsic grid
tracks). Link padding is 4px, border 1px; at viewport 360/390/400/430px the
calculated image boxes are 151/166/171/186px. This is layout arithmetic, not a
claimed browser measurement. All categories remain in the full grid below;
an explicit כל הקטגוריות anchor makes it discoverable. The full grid also uses
square/full-width images. Live search suggestions keep their small cards.

Results cards were width 343px with unconstrained 4:5 aspect (429px high).
They now cap at 220px on mobile (280px on desktop), preserving contain and white
background. No two-column product grid is forced, so names/buttons stay usable
at 360px. SKU and fitment remain outside the image. Product detail caps at 300px.
No product data, prices, image files, fitment or source catalog changed.

Regression: emitted SSR + generated CSS + explicit 360–430px container arithmetic.
Full device/browser QA remains required before merge. No AI/photos/deletions.
