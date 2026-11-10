# Mobile image balance — 7.11.2026

Home category entry is the squircle rail in `HomeCategoryRail` (iOS-style
rounded squares, ~4.5 tiles visible on mobile, momentum scroll). The older
duplicate `HomeSearchHero` search box and its 2-column quick-category grid
were removed in the home polish; header search remains the single search
field. "לכל הקטגוריות" links to `/results` (the full catalog), not back to
the rail's own `#categories` section.

Results cards were width 343px with unconstrained 4:5 aspect (429px high).
They now cap at 220px on mobile (280px on desktop), preserving contain and white
background. No two-column product grid is forced, so names/buttons stay usable
at 360px. SKU and fitment remain outside the image. Product detail caps at 300px.
No product data, prices, image files, fitment or source catalog changed.

Regression: emitted SSR + generated CSS (category rail squircles, product
photo caps). Full device/browser QA remains required before merge. No AI/photos/deletions.
