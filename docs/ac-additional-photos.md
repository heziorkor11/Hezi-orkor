# Additional approved AC product photos — 2026-11-08

Base: current main `075bc6bebbc498c62b30c758807e911d989271b4` (merged PR #20).

User explicitly approved all 133 additions, including designer-upscaled images. This import performs only WebP encoding of the supplied approved JPEGs, not new AI processing or generative edits.

The updated `polished/status.csv` (with method column), not the initial SUMMARY_he.txt, is authoritative. Select `status=ok` or `status=ok-ai-upscaled` and subtract SKUs present in any existing main image map. Exactly 133 remain, none already mapped anywhere on main: 126 approved Real-ESRGAN-upscaled photos and 7 approved background fixes. Split: 102 compressors, 31 condensers. All 516 remaining `needs-source` rows are excluded. The original 898 approved photo assets/maps/provenance are unchanged.

New map: `public/catalog/images/ac-additional-2026-11-08.json`, appended to the existing manifest. Output: 1200×1200 WebP, quality 85/method 6. No crop or product edits. Source provenance includes original source image URL, supplier SKU, evidence, designer status and method, input/output SHA256, bytes, and fingerprint of the updated approval CSV. No product/source rows, prices, names, fitments, visibility or categories changed.

Checks: `scripts/check-ac-additional-photos.mjs` verifies exact 133 map entries, no overlap with the original approved batch, status split 126+7, all WebP hashes/signatures, both sample product pages and all compressor/condenser listing pages; every new mapped image must resolve and photos precede placeholders across pagination. Actual emitted Vercel handler, read-only cwd, no outbound HTTP. Original 898-photo checks remain active too. Included in production build gates. Browser/mobile QA remains separate; no browser verification is claimed.

Samples:
- AI-upscaled compressor: `/product/HZ-CMP-00001`
- Condenser (also approved upscaled): `/product/HZ-CND-00001`

No Production/env/protection setting changes; no merge.
