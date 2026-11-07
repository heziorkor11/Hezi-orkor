# Storefront QA fixes (isolated from admin PR #9)

- Unknown category: explicit Hebrew state and metadata; no raw category name or oils empty-state copy; no unnecessary catalog fetch. Legacy oil/cabin category aliases remain normalized. HTTP 200 for an invalid query on the valid results route.
- Unknown paths: explicit catch-all with notFound() and root fallback, Hebrew page, noindex metadata and actual HTTP 404.
- Shared neutral ProductImage fallback in product, listing and related cards. Missing/known generic artwork is not requested; failed image loads switch to the same neutral icon/text. No generated images or source image edits.
- Display-only spacing for HZ-GEN-00005 and HZ-GEN-01392, restricted by SKU to avoid changing OE/part-number tokens elsewhere. No non-whitespace character changes. Raw catalog, prices, fitment/year/model fields, and HZ-GEN-00023/00025 remain unchanged.

Checks: npm run build; node --test scripts/storefront-qa.test.mjs; node scripts/check-storefront-qa.mjs (real emitted Vercel handler). Baseline main commit 952b047 also fails 16 existing template tests and the same unknown-error TypeScript check in error-component.tsx; these are not introduced here. Mobile browser screenshots and client-side image-error transitions still need browser QA; HTTP/SSR checks are not visual verification.

## Serverless catalog follow-up
Preview logs proved the loader attempted JSON.parse on HTML while loading manifest.json / sku-map.json. Its catalog JSON was only in static hosting, not the function; fallback self-fetch crossed deployment protection (or another HTML origin). Catalog I/O on main was byte-identical and also lacked packaging; live Production comparison returned checkpoint HTTP 429, so its actual catalog content is unverified. This is not caused by the catch-all route.

Package immutable JSON (not image binaries) into the function as catalog-data and resolve relative to the emitted module. On Vercel fail explicitly if an asset is missing instead of fetching a protected Preview or stale Production catalog. No environment-variable changes, protection changes, or admin PR dependency. Build now runs a real emitted-handler test from read-only /proc with all outbound fetch forbidden; category, SKU search, both products and missing-image fallback must work there.
