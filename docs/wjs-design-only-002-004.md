# WJS design-only batches 002–004

Owner explicitly approved: “כן, תעלה תמונות WJS לפי התאמת קוד גם בלי לוגו”.
Only CSV `ready-design-only` rows and the five `ready-design-only` ZIPs
were considered. No needs-review archive opened or its images used.

305 designed-status rows: 291 ready candidates (133 batch002, 147 batch003,
11 batch004), 14 needs-review skipped. Exact existing HZ + unique internal
supplier SKU, independently recorded WJS page SKU/title/URL/image URL,
full and original catalog title, and no contradictory axle label required.
Existing mapped/embedded photos must never be replaced.

Final: 290 imported (133 batch002, 146 batch003, 11 batch004).
14 needs-review rows plus HZ-BRK-00850 skipped: title says rear while a
source collection also says front. No category/data correction attempted.
Six titles differed only by repeated whitespace; whitespace-normalized exact
matching accepted them, without changing any catalog/source text.

All selected photos have `brand_visual_check=no-logo-unverified`. Their
manufacturer/brand identity is NOT established visually. Code-based photo
use is the owner's explicit exception, not a new brand verification claim.
Catalog brands, categories, names, labels and prices are untouched.

Batch004 superseded-source warning was checked: the two drawings 01321/
01322 are still needs-review and excluded. 01340 is designer ready, with
only generic install text on anti-noise film; preserved without modification.

Lossless WebP from designed RGB 1200×1200 ZIP members; decoded pixels
identical, no new resize/crop/AI/logo removal. Full hashes/source evidence,
brand limitations and per-row decisions in the new sources JSON.
Build gate verifies all newly imported product pages and every brake listing
page with zero previous-map overlap, read-only bundle/no outbound requests.
PR24 remains separate and must not be merged.

Approved filenames end in `-code-matched.webp`, as AC imports use a textual
suffix too. A bare HZ numerical suffix could be mistaken for an OE-number
filename by the existing shared-OE image safety policy (caught on 01018 in
emitted runtime tests). No image-policy/business logic was changed.
