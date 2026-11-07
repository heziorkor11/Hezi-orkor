#!/bin/sh
set -e
node scripts/validate-catalog.mjs
node scripts/with-app-env.mjs vite build
node scripts/bundle-server-catalog.mjs
node scripts/check-built-admin.mjs
node scripts/check-built-admin-readonly.mjs
node scripts/check-admin-overlay-client.mjs
npm run db:migrate
