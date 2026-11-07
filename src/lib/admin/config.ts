/** Runtime-only switches. Production can NEVER enable the ephemeral QA dashboard. */
export type AdminMode = "disabled" | "local" | "preview-demo" | "git";
export function adminRuntimeMode(): AdminMode {
  if (typeof process === "undefined" || typeof window !== "undefined") return "disabled";
  const e = process.env;
  if (
    e.VERCEL_ENV === "preview" &&
    e.VERCEL_GIT_COMMIT_REF === "feature/admin-dashboard" &&
    e.ADMIN_PREVIEW_DEMO === "1" &&
    e.ADMIN_STORAGE === "ephemeral"
  )
    return "preview-demo";
  if (
    e.ADMIN_STORAGE === "git" &&
    (!e.VERCEL || e.ADMIN_GITHUB_BRANCH === e.VERCEL_GIT_COMMIT_REF) &&
    e.ADMIN_GITHUB_TOKEN &&
    e.ADMIN_GITHUB_REPO &&
    e.ADMIN_GITHUB_BRANCH &&
    /^[a-f0-9]{64}$/i.test(e.ADMIN_GIT_ENCRYPTION_KEY || "")
  )
    return "git";
  if (!e.VERCEL && e.ADMIN_LOCAL_ENABLED === "1" && e.ADMIN_STORAGE === "local") return "local";
  return "disabled";
}
export function adminRuntimeDirectory() {
  if (adminRuntimeMode() === "git") {
    const id = (process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || "git").replace(
      /[^a-zA-Z0-9_-]/g,
      "_",
    );
    return process.env.VERCEL
      ? `/tmp/hezi-admin-git-${id}`
      : process.env.ADMIN_DATA_DIR || ".data/admin-git-temporary";
  }
  if (adminRuntimeMode() === "preview-demo") {
    const id = (process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || "demo").replace(
      /[^a-zA-Z0-9_-]/g,
      "_",
    );
    return `/tmp/hezi-admin-preview-${id}`;
  }
  return process.env.ADMIN_DATA_DIR || ".data/admin";
}
export function adminRequestHostAllowed(host: string) {
  if (adminRuntimeMode() === "local") return ["localhost", "127.0.0.1", "[::1]"].includes(host);
  if (adminRuntimeMode() === "git") {
    if (!process.env.VERCEL && ["localhost", "127.0.0.1", "[::1]"].includes(host)) return true;
    return [
      process.env.VERCEL_URL,
      process.env.VERCEL_BRANCH_URL,
      ...(process.env.ADMIN_GIT_ALLOWED_HOSTS || "").split(","),
    ]
      .filter(Boolean)
      .includes(host);
  }
  if (adminRuntimeMode() !== "preview-demo") return false;
  return [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL].filter(Boolean).some((value) => {
    try {
      return new URL(`https://${value!.replace(/^https?:\/\//, "")}`).hostname === host;
    } catch {
      return false;
    }
  });
}
