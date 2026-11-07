/** Fake GitHub only: never sends a request to a real service. */
import assert from "node:assert/strict";
import { randomBytes, createDecipheriv } from "node:crypto";
export function fakeGitHub() {
  const files = new Map();
  let seq = 0;
  const fixture = { files, writes: [], private: false, failVisibility: false, conflicts: 0 };
  fixture.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://api.github.com", "unexpected outbound network request");
    assert.equal(init.headers.Authorization, "Bearer fixture-token-not-real");
    if (url.pathname === "/repos/heziorkor11/Hezi-orkor")
      return Response.json(fixture.failVisibility ? {} : { private: fixture.private });
    const path = decodeURIComponent(url.pathname.split("/contents/")[1] || "");
    assert.ok(path.startsWith("admin-data/"), path);
    if (init.method === "PUT") {
      const body = JSON.parse(init.body);
      assert.equal(body.branch, "feature/admin-dashboard");
      if (fixture.conflicts-- > 0) return Response.json({}, { status: 409 });
      const old = files.get(path);
      if (old && old.sha !== body.sha) return Response.json({}, { status: 409 });
      const file = { content: body.content, sha: String(++seq), encoding: "base64" };
      files.set(path, file);
      fixture.writes.push({ path, ...body });
      return Response.json({ content: { sha: file.sha } }, { status: old ? 200 : 201 });
    }
    assert.equal(url.searchParams.get("ref"), "feature/admin-dashboard");
    const file = files.get(path);
    if (!file) return Response.json({}, { status: 404 });
    if (init.headers.Accept.includes("raw"))
      return new Response(Buffer.from(file.content, "base64"));
    return Response.json(file);
  };
  fixture.decrypt = () => {
    const envelope = JSON.parse(Buffer.from(files.get("admin-data/state.json").content, "base64"));
    const d = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(process.env.ADMIN_GIT_ENCRYPTION_KEY, "hex"),
      Buffer.from(envelope.iv, "base64"),
    );
    d.setAAD(Buffer.from("heziorkor11/Hezi-orkor:admin-data/state.json"));
    d.setAuthTag(Buffer.from(envelope.tag, "base64"));
    return JSON.parse(Buffer.concat([d.update(Buffer.from(envelope.data, "base64")), d.final()]));
  };
  return fixture;
}
export function configureGitTest() {
  Object.assign(process.env, {
    ADMIN_STORAGE: "git",
    ADMIN_GITHUB_TOKEN: "fixture-token-not-real",
    ADMIN_GITHUB_REPO: "heziorkor11/Hezi-orkor",
    ADMIN_GITHUB_BRANCH: "feature/admin-dashboard",
    ADMIN_GIT_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
    ADMIN_GIT_ALLOWED_HOSTS: "local.invalid",
    VERCEL: "1",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "feature/admin-dashboard",
  });
}
