#!/bin/sh
set -e
node scripts/validate-catalog.mjs
node scripts/build-admin-sku-reservations.mjs
node scripts/with-app-env.mjs vite build
node scripts/bundle-server-catalog.mjs
node scripts/test-admin-git.mjs
node scripts/check-built-admin-git.mjs
node scripts/check-built-admin.mjs
node scripts/check-built-admin-readonly.mjs
node scripts/check-admin-overlay-client.mjs
npm run db:migrate

node scripts/test-bulk-tiers.mjs
