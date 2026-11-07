# Visibility-only follow-up

Hide HZ-GEN-01392 and HZ-GEN-01393 at Matan's request while fitment remains unverified. No source product/price rows are deleted or edited. Persistent visibility-overrides.json feeds the existing display-taxonomy hidden flag; category/subcategory visible counts decrease by two. Existing listing/search/featured/related/product loaders already honor this flag. Rebuilding taxonomy retains the approval.

Existing product-display regression fixtures now respect explicit hidden policy, expecting HTTP 404 rather than trying to expose hidden products. A dedicated emitted-function test requires both exact product URLs to return Hebrew 404 and excludes links from search, category, home and a related-product page, while confirming raw source rows remain. No environment/protection changes or admin PR #9 merge.
