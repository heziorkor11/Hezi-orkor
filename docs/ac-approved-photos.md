# Approved compressor/condenser product photos — 2026-11-08

- Base: main `01d8f7f51a85716870df3d40fcb5c6fc45d7f16b` (includes merged image-first PR #18).
- Source approval: `/workspace/images-condensers-2026-11-08/polished/status.csv`, exactly `status=ok` (898 distinct SKUs). `needs-source` (649) is excluded from this new batch; existing legacy image mappings/assets are not deleted or otherwise changed.
- Approved split: 670 `ac-compressor`, 228 `ac-condenser`. No catalog rows, titles, prices, fitment, category assignments or visibility changes.
- Input: designer-approved SKU-named 1200×1200 JPEGs. Output: same dimensions, WebP quality 85/method 6, no crop, no generative edits and no product alterations.
- Added map: `public/catalog/images/ac-approved-2026-11-08.json`, appended to the existing image manifest. Photos use the same SKU map resolver as earlier polished batches and participate in the existing image-first listing order.
- Provenance: `public/catalog/images/ac-approved-2026-11-08-sources.json` contains original supplier SKU, source filename/URL/evidence, designer status, input/output SHA256 and output bytes for each SKU. Original inputs remain untouched.
- `scripts/check-ac-product-photos.mjs` verifies all 898 WebP signatures/bytes/hashes, both example product pages, every compressor/condenser results page, exact image resolution for every approved SKU and photo-before-placeholder ordering across pagination. Uses actual emitted Vercel handler, read-only cwd, no network. Included in production build gates.
- Browser/mobile interaction QA remains separate; the generated contact sheet is visual image review, not a browser screenshot. No Production settings or deployment protection settings changed. PR is review-ready, not merged.

Paths for QA:
- `/product/HZ-CMP-00003`
- `/product/HZ-CND-00004`
- `/results?category=ac-compressor`
- `/results?category=ac-condenser`
