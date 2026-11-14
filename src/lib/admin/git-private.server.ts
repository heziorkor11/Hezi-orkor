import { adminDataRepo, adminGithubBranch } from "./config.ts";
import { githubRepoIsPrivate } from "./git-catalog.server.ts";

/** Paths allowed in the private data repo only. Never write these to the public store repo. */
export const PRIVATE_GIT_PATHS = [
  "orders/orders.json",
  "admin/private-users.json",
  "admin/preview/private-users.json",
] as const;

export type PrivateGitPath = (typeof PRIVATE_GIT_PATHS)[number];

export type PrivateFile = { content: string; sha: string };

export type PrivateGitOps = {
  isPrivate: (repo: string) => Promise<boolean | null>;
  readFile: (repo: string, branch: string, path: string) => Promise<PrivateFile | null>;
  putFile: (
    repo: string,
    branch: string,
    path: string,
    content: string,
    message: string,
    sha?: string,
  ) => Promise<void>;
};

let testOps: PrivateGitOps | null = null;

export function setPrivateGitOpsForTests(ops: PrivateGitOps | null) {
  testOps = ops;
}

export function isPrivateGitPath(path: string): path is PrivateGitPath {
  return (PRIVATE_GIT_PATHS as readonly string[]).includes(path);
}

export function assertPrivateGitPath(path: string): asserts path is PrivateGitPath {
  if (!isPrivateGitPath(path)) {
    throw new Error("Refusing to use a non-allowlisted path in the private data repo");
  }
}

/** Production users live at admin/private-users.json. Preview/local use a separate path so they never mix. */
export function privateUsersPath(): PrivateGitPath {
  const override = (process.env.ADMIN_DATA_USERS_PATH || "").trim();
  if (override) {
    assertPrivateGitPath(override);
    if (override === "orders/orders.json") {
      throw new Error("ADMIN_DATA_USERS_PATH cannot point at the orders file");
    }
    return override;
  }
  return process.env.VERCEL_ENV === "production" ? "admin/private-users.json" : "admin/preview/private-users.json";
}

export function privateOrdersPath(): PrivateGitPath {
  return "orders/orders.json";
}

export function privateDataBranch() {
  return (process.env.ADMIN_DATA_GITHUB_BRANCH || adminGithubBranch() || "main").trim();
}

function authHeaders(): HeadersInit {
  const token = process.env.ADMIN_GITHUB_TOKEN;
  if (!token) throw new Error("ADMIN_GITHUB_TOKEN is not set");
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "hezi-orkor-admin",
  };
}

const defaultOps: PrivateGitOps = {
  async isPrivate(repo) {
    return githubRepoIsPrivate(repo);
  },
  async readFile(repo, branch, path) {
    const token = process.env.ADMIN_GITHUB_TOKEN;
    if (!token) throw new Error("ADMIN_GITHUB_TOKEN is not set");
    const get = await fetch(
      `https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`,
      { headers: authHeaders() },
    );
    if (get.status === 404) return null;
    if (!get.ok) throw new Error(`Private repo read failed (${get.status})`);
    const body = (await get.json()) as { sha?: string; content?: string; encoding?: string };
    if (!body.sha) throw new Error("Private repo read missing sha");
    const raw = body.content ? Buffer.from(body.content.replace(/\n/g, ""), "base64").toString("utf8") : "";
    return { content: raw, sha: body.sha };
  },
  async putFile(repo, branch, path, content, message, sha) {
    const put = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content, "utf8").toString("base64"),
        branch,
        sha,
      }),
    });
    if (!put.ok) throw new Error(`Private repo commit failed (${put.status})`);
  },
};

function ops(): PrivateGitOps {
  return testOps || defaultOps;
}

export async function privateDataRepoReady(): Promise<boolean> {
  const repo = adminDataRepo();
  if (!repo) return false;
  try {
    return (await ops().isPrivate(repo)) === true;
  } catch {
    return false;
  }
}

export async function assertPrivateDataRepo(): Promise<string> {
  const repo = adminDataRepo();
  if (!repo) throw new Error("ADMIN_DATA_GITHUB_REPO is not set");
  const priv = await ops().isPrivate(repo);
  if (priv !== true) throw new Error("Refusing to store private data: data repo is not private");
  return repo;
}

export async function readPrivateFile(path: string): Promise<PrivateFile | null> {
  assertPrivateGitPath(path);
  const repo = await assertPrivateDataRepo();
  return ops().readFile(repo, privateDataBranch(), path);
}

export async function commitPrivateFile(opts: { path: string; content: string; message: string }) {
  assertPrivateGitPath(opts.path);
  const repo = await assertPrivateDataRepo();
  if (!process.env.ADMIN_GITHUB_TOKEN && !testOps) throw new Error("ADMIN_GITHUB_TOKEN is not set");
  const branch = privateDataBranch();
  const current = await ops().readFile(repo, branch, opts.path);
  await ops().putFile(repo, branch, opts.path, opts.content, opts.message, current?.sha);
}

/** @deprecated use commitPrivateFile — kept as a thin wrapper */
export async function commitPrivateOrders(content: string) {
  await commitPrivateFile({
    path: privateOrdersPath(),
    content,
    message: "chore(admin): update orders (private)",
  });
}
