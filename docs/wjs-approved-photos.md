# WJS approved photos

Source: `wjs_mazgan/designed/master_mapping_designed.csv`, owner approval
“כן, תעלה את תמונות WJS”. Only `design_status=ready` rows considered.
Matching uses **exact supplier SKU** in the existing master workbook's
internal sheet (supplier identity preserved in provenance), then verifies
the target SKU exists in the emitted catalog. No suffix stripping, fuzzy
OE/name guesses, new products, category changes, or image replacements.

Shared identifiers additionally require exact original product name:
- 7803A112WJS: Lancer/Fulback -> HZ-CAF-00124. Triton row remains needs-review.
- 8754E: normal -> HZ-CAF-00145; carbon (“פחם”) -> HZ-CAF-00146.

265 ready rows: 126 imported, 87 without exact supplier SKU match,
52 rows already have a catalog image (including 3 views of A183, left
untouched). Another 41 needs-review + 1 quarantine skipped regardless
of possible matches. The two brake-disc rows have exact supplier SKU
and original-name matches; all other imported rows are cabin filters.

Designed images re-encoded losslessly as WebP without geometric transforms.
Full row-level decisions, source URLs, names, CSV line numbers, dimensions,
and SHA-256 provenance: `public/catalog/images/wjs-approved-2026-11-08-sources.json`.
Build gate verifies no old-map intersection, all hashes, all 126 product
pages and all affected category pages using emitted server in read-only cwd.
No browser mobile QA claimed; preview awaits owner QA. PR22 remains separate.
