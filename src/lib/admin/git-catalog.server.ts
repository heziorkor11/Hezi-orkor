import { adminGithubBranch, adminGithubRepo } from "./config.ts";
import { PUBLIC_GIT_PATHS } from "./types.ts";

type GhFile = { sha: string; content?: string };

async function gh(path: string, init?: RequestInit) {
  const token = process.env.ADMIN_GITHUB_TOKEN;
  if (!token) throw new Error("ADMIN_GITHUB_TOKEN is not set");
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "hezi-orkor-admin",
      ...(init?.headers || {}),
    },
  });
  return res;
}

export async function githubRepoIsPrivate(repo: string): Promise<boolean | null> {
  try {
    const res = await gh(`/repos/${repo}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { private?: boolean };
    return Boolean(data.private);
  } catch {
    return null;
  }
}

export async function assertPublicRepoAllowsPath(path: string) {
  if (!(PUBLIC_GIT_PATHS as readonly string[]).includes(path)) {
    throw new Error("This path is not allowed on the public catalog repo");
  }
}

export async function commitPublicFile(opts: {
  path: string;
  content: string;
  message: string;
}): Promise<boolean> {
  await assertPublicRepoAllowsPath(opts.path);
  const repo = adminGithubRepo();
  const branch = adminGithubBranch();
  const privacy = await githubRepoIsPrivate(repo);
  if (privacy === true) {
    /* private is fine for catalog files too */
  }
  const get = await gh(`/repos/${repo}/contents/${opts.path}?ref=${encodeURIComponent(branch)}`);
  let sha: string | undefined;
  if (get.status === 200) {
    const body = (await get.json()) as GhFile;
    sha = body.sha;
  } else if (get.status !== 404) {
    const text = await get.text();
    throw new Error(`GitHub read failed (${get.status}): ${text.slice(0, 200)}`);
  }
  const put = await gh(`/repos/${repo}/contents/${opts.path}`, {
    method: "PUT",
    body: JSON.stringify({
      message: opts.message,
      content: Buffer.from(opts.content, "utf8").toString("base64"),
      branch,
      sha,
    }),
  });
  if (!put.ok) {
    const text = await put.text();
    throw new Error(`GitHub commit failed (${put.status}): ${text.slice(0, 200)}`);
  }
  return true;
}
