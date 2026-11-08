# Manufacturer marks kept — approved photo batch 2026-11-08

Base: latest main `2d1be67f2593e72ed18570c7beedc2a4f83e7155` after PR #21. No source rows, prices, names, fitments, categories, visibility or prior images changed. No merge.

## Selection and exclusions
The current `polished/needs-source.csv` has 513 entries. CSV exclusions: 264 drawing/schematic, 15 wrong-content, 1 bad-background = 280. This leaves 232 watermark/logo entries plus 1 visible supplier part-number label (`HZ-CMP-00350`), 233 candidates for the owner's keep-the-mark decision.

Visual inspection of all 233 candidates found 17 additional misclassified entries and excluded them as required: 14 drawings/schematics and 3 wrong-content (foam-only, logo-only, SAMPLE IMAGE placeholder). Exact SKU/reasons are in the sources manifest. Final import: **216 photographs: 89 compressors + 127 condensers**. Total excluded from the CSV: **297: 278 drawings, 18 wrong-content, 1 background**. These exclusions do not delete or change any existing product or image.

Nine AHE-marked candidate files are technical drawings (some with dimensions), not photos, so they are excluded rather than inventing an AHE photo sample. NRF photo sample: `/product/HZ-CND-00033`. Another verified manufacturer-mark photo (DASIS): `/product/HZ-CND-00359`.

## Keep the watermark exactly
All selected photos already have designer 1200×1200 polished versions in `_needs-source`; the explicit `watermark-sample/HZ-CND-00033-polished-with-watermark.jpg` takes priority for that SKU. Reused these approved-to-show-mark outputs directly. No new AI, background masking, crop, watermark removal or text/logo replacement. **Lossless WebP** preserves every decoded RGB pixel of the selected designer JPEG. Import checked input/output pixel SHA256 equality for every image. No fresh polish fallback was necessary because all 216 polished versions exist.

`public/catalog/images/ac-watermarked-2026-11-08.json` is appended to the existing manifest. `ac-watermarked-2026-11-08-sources.json` records source supplier SKU/URL/evidence, source rejection reason, explicit owner watermark exception, exact designer input, input-file hash, decoded RGB pixel hash, output hash/bytes and the complete exclusion list. The original needs-source CSV is not rewritten.

## Verification
Full build includes the previous 898 and 133 photo-batch checks plus `check-ac-watermarked-photos.mjs`. The new emitted-handler test validates all 216 exact image paths/hash/bytes, excludes all 297 blocked SKUs from this batch, both sample pages and every compressor/condenser listing page with photo-first pagination. Read-only cwd and no network. Visual image review is not browser/mobile interaction QA; Preview is for that review. No Production/env/protection settings changes.

## Mobile QA follow-up: padded blue backdrop

Audited all 216 actual WebPs, not thumbnails. The outer 12-pixel border
was already white in all 216: white padding concealed HZ-CND-00002's
blue **inner source-photo rectangle**. The additional content-bounds corner
check (at least 3 non-white/tinted corners, ignoring corners occupied by
product/wordmark) flagged exactly that one image. Its pale-blue backdrop
was keyed to white without AI, resizing, or cropping. All darker product
and watermark strokes (minimum RGB channel <160) are byte-for-byte unchanged.
The faint source-frame line was whitened outside any product/wordmark.
No images removed: final 216. No second image required correction.

`python3 scripts/audit-ac-watermarked-backgrounds.py` (Pillow + NumPy)
checks all dimensions (1200×1200), outer border mean >=245 without tint,
and internal rectangular backdrops. Full per-SKU pixel measurements:
`public/catalog/images/ac-watermarked-background-audit.json`.
Local comparison also checked all 216 against their designer inputs:
identical dimensions, with no geometric transform/resampling introduced.
This verifies this import has not stretched the designer images; dimensions
alone cannot prove the geometry of supplier originals before designer work.
