import assert from "node:assert/strict";
import { test } from "node:test";
import { canManageHomeHero, heroMasterGuard, HERO_MASTER_ONLY_ERROR } from "./home-hero-access.ts";
import { isAllowedPublicBinaryPath } from "./git-catalog.server.ts";
import { PUBLIC_GIT_PATHS } from "./types.ts";

test("only a master can manage the home hero banner", () => {
  assert.equal(canManageHomeHero("master"), true);
  assert.equal(canManageHomeHero("worker"), false);
  assert.equal(canManageHomeHero(undefined), false);
  assert.deepEqual(heroMasterGuard("master"), { ok: true });
  const denied = heroMasterGuard("worker");
  assert.equal(denied.ok, false);
  if (!denied.ok) {
    assert.equal(denied.status, 403);
    assert.equal(denied.error, HERO_MASTER_ONLY_ERROR);
  }
});

test("home hero overlay is on the public catalog allowlist", () => {
  assert.ok((PUBLIC_GIT_PATHS as readonly string[]).includes("public/catalog/home-hero-overrides.json"));
});

test("hero upload paths are allowed next to existing product image paths", () => {
  assert.equal(
    isAllowedPublicBinaryPath("public/catalog/admin-images/HZ-BRK-00248-abcd1234.jpg"),
    true,
  );
  assert.equal(
    isAllowedPublicBinaryPath("public/catalog/admin-images/hero-brakes-abcd1234.jpg"),
    true,
  );
  assert.equal(
    isAllowedPublicBinaryPath("public/catalog/admin-images/hero-s-abc123-deadbeef.webp"),
    true,
  );
  assert.equal(isAllowedPublicBinaryPath("public/catalog/admin-images/evil.js"), false);
  assert.equal(isAllowedPublicBinaryPath("public/catalog/prices.json"), false);
});
