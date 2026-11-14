import { adminDataRepo, adminGithubBranch } from "./config";
import { githubRepoIsPrivate } from "./git-catalog.server";

/** Commit order JSON to the private data repo only. Never called for the public store repo. */
export async function commitPrivateOrders(content: string) {
  const repo = adminDataRepo();
  if (!repo) throw new Error("ADMIN_DATA_GITHUB_REPO is not set");
  const priv = await githubRepoIsPrivate(repo);
  if (priv !== true) throw new Error("Refusing to store orders: data repo is not private");
  const token = process.env.ADMIN_GITHUB_TOKEN;
  if (!token) throw new Error("ADMIN_GITHUB_TOKEN is not set");
  const branch = process.env.ADMIN_DATA_GITHUB_BRANCH || adminGithubBranch();
  const path = "orders/orders.json";
  const get = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "hezi-orkor-admin",
      },
    },
  );
  let sha: string | undefined;
  if (get.status === 200) {
    sha = ((await get.json()) as { sha: string }).sha;
  } else if (get.status !== 404) {
    throw new Error(`Private repo read failed (${get.status})`);
  }
  const put = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "hezi-orkor-admin",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "chore(admin): update orders (private)",
      content: Buffer.from(content, "utf8").toString("base64"),
      branch,
      sha,
    }),
  });
  if (!put.ok) throw new Error(`Private repo commit failed (${put.status})`);
}
