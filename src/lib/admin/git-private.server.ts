import { adminDataRepo, adminGithubBranch } from "./config.ts";
import { githubRepoIsPrivate } from "./git-catalog.server.ts";

/** Paths allowed in the private data repo only. Never write these to the public store repo. */
export const PRIVATE_GIT_PATHS = [
  "orders/orders.json",
  "orders/preview/orders.json",
  "admin/private-users.json",
  "admin/preview/private-users.json",
  "admin/activity.json",
  "admin/preview/activity.json",
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

const ORDER_PDF_PATH = /^orders\/(preview\/)?pdfs\/HZ-ORD[A-Za-z0-9_-]+\.pdf$/;

export function isOrderPdfPath(path: string): boolean {
  return ORDER_PDF_PATH.test(path);
}

export function isPrivateGitPath(path: string): path is PrivateGitPath | (string & { __private: true }) {
  return (PRIVATE_GIT_PATHS as readonly string[]).includes(path) || isOrderPdfPath(path);
}

export function assertPrivateGitPath(path: string): asserts path is string {
  if (!isPrivateGitPath(path)) {
    throw new Error("Refusing to use a non-allowlisted path in the private data repo");
  }
}

/** Production activity lives at admin/activity.json. Preview/local use a separate path. */
export function privateActivityPath(): string {
  const override = (process.env.ADMIN_DATA_ACTIVITY_PATH || "").trim();
  if (override) {
    assertPrivateGitPath(override);
    if (!override.endsWith("activity.json")) {
      throw new Error("ADMIN_DATA_ACTIVITY_PATH must be an activity.json file");
    }
    return override;
  }
  return process.env.VERCEL_ENV === "production" ? "admin/activity.json" : "admin/preview/activity.json";
}

export function privateOrderPdfPath(orderId: string): string {
  const safe = String(orderId || "").replace(/[^A-Za-z0-9_-]/g, "");
  if (!safe.startsWith("HZ-ORD")) throw new Error("מזהה הזמנה לא תקין לקובץ PDF");
  const folder = privateOrdersPath().includes("preview") ? "orders/preview/pdfs" : "orders/pdfs";
  const path = `${folder}/${safe}.pdf`;
  assertPrivateGitPath(path);
  return path;
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

/** Production orders live at orders/orders.json. Preview/local use a separate path so they never mix. */
export function privateOrdersPath(): PrivateGitPath {
  const override = (process.env.ADMIN_DATA_ORDERS_PATH || "").trim();
  if (override) {
    assertPrivateGitPath(override);
    if (override === "admin/private-users.json" || override === "admin/preview/private-users.json") {
      throw new Error("ADMIN_DATA_ORDERS_PATH cannot point at the users file");
    }
    return override;
  }
  return process.env.VERCEL_ENV === "production" ? "orders/orders.json" : "orders/preview/orders.json";
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

export async function readPrivateBinary(path: string): Promise<{ bytes: Buffer; sha: string } | null> {
  assertPrivateGitPath(path);
  const file = await readPrivateFile(path);
  if (!file) return null;
  // Files were stored as standard GitHub base64 of the raw bytes. readPrivateFile
  // already decoded that as UTF-8, which corrupts PDFs — read via ops again as raw.
  const repo = await assertPrivateDataRepo();
  const token = process.env.ADMIN_GITHUB_TOKEN;
  if (!testOps && !token) throw new Error("ADMIN_GITHUB_TOKEN is not set");
  if (testOps) {
    // Test ops store latin1-safe text; interpret content as binary string.
    return { bytes: Buffer.from(file.content, "latin1"), sha: file.sha };
  }
  const get = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(privateDataBranch())}`,
    { headers: authHeaders() },
  );
  if (get.status === 404) return null;
  if (!get.ok) throw new Error(`Private repo read failed (${get.status})`);
  const body = (await get.json()) as { sha?: string; content?: string };
  if (!body.sha) throw new Error("Private repo read missing sha");
  const bytes = Buffer.from((body.content || "").replace(/\n/g, ""), "base64");
  return { bytes, sha: body.sha };
}

export async function commitPrivateBinary(opts: { path: string; bytes: Buffer; message: string }) {
  assertPrivateGitPath(opts.path);
  const repo = await assertPrivateDataRepo();
  if (!process.env.ADMIN_GITHUB_TOKEN && !testOps) throw new Error("ADMIN_GITHUB_TOKEN is not set");
  const branch = privateDataBranch();
  const current = await ops().readFile(repo, branch, opts.path);
  const b64 = opts.bytes.toString("base64");
  if (testOps) {
    await ops().putFile(repo, branch, opts.path, opts.bytes.toString("latin1"), opts.message, current?.sha);
    return;
  }
  const put = await fetch(`https://api.github.com/repos/${repo}/contents/${opts.path}`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: opts.message,
      content: b64,
      branch,
      sha: current?.sha,
    }),
  });
  if (!put.ok) throw new Error(`Private repo commit failed (${put.status})`);
}
