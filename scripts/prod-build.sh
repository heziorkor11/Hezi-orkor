#!/bin/sh
set -e
node scripts/validate-catalog.mjs
node scripts/with-app-env.mjs vite build
node scripts/bundle-server-catalog.mjs
node --test scripts/cart-links.test.mjs
node scripts/check-cart-links.mjs
npm run db:migrate
