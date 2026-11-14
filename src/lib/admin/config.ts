/** Runtime admin mode. Production never enables the preview-only demo logins. */
export type AdminMode = "disabled" | "local" | "preview-demo" | "git";

export function adminMode(): AdminMode {
  if (typeof process === "undefined") return "disabled";
  const e = process.env;
  const hasSession = Boolean(e.ADMIN_SESSION_SECRET && e.ADMIN_SESSION_SECRET.length >= 16);
  const hasLogin = Boolean(e.ADMIN_MASTER_PASSWORD || e.ADMIN_MASTER_PASSWORD_HASH);
  const gitReady = Boolean(e.ADMIN_GITHUB_TOKEN && (e.ADMIN_GITHUB_REPO || "heziorkor11/Hezi-orkor"));
  if (e.VERCEL_ENV === "production") {
    if (hasSession && hasLogin) return gitReady ? "git" : "local";
    return "disabled";
  }
  if (e.VERCEL_ENV === "preview" && e.ADMIN_PREVIEW_DEMO === "1" && hasSession && hasLogin) {
    return gitReady ? "git" : "preview-demo";
  }
  if (!e.VERCEL && e.ADMIN_LOCAL_ENABLED === "1" && hasSession && hasLogin) {
    return gitReady ? "git" : "local";
  }
  return "disabled";
}

export function adminEnabled() {
  return adminMode() !== "disabled";
}

export function gitCatalogEnabled() {
  return adminMode() === "git" && Boolean(process.env.ADMIN_GITHUB_TOKEN);
}

export function adminGithubRepo() {
  return (process.env.ADMIN_GITHUB_REPO || "heziorkor11/Hezi-orkor").trim();
}

export function adminGithubBranch() {
  return (
    process.env.ADMIN_GITHUB_BRANCH ||
    process.env.VERCEL_GIT_COMMIT_REF ||
    "main"
  ).trim();
}

export function adminDataRepo() {
  return (process.env.ADMIN_DATA_GITHUB_REPO || "").trim();
}

export function ephemeralDir() {
  const e = process.env;
  if (!e.VERCEL) return e.ADMIN_DATA_DIR || ".data/admin";
  const id = (e.VERCEL_DEPLOYMENT_ID || e.VERCEL_URL || "preview").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `/tmp/hezi-admin-${id}`;
}

export function publicSiteOrigin() {
  const e = process.env;
  if (e.ADMIN_PUBLIC_ORIGIN) return e.ADMIN_PUBLIC_ORIGIN.replace(/\/$/, "");
  if (e.VERCEL_ENV === "production") return "https://hezi-orkor.vercel.app";
  if (e.VERCEL_URL) return `https://${String(e.VERCEL_URL).replace(/^https?:\/\//, "")}`;
  return "http://127.0.0.1:8080";
}

export function sessionCookieName() {
  return process.env.VERCEL ? "__Host-hezi-admin" : "hezi_admin_session";
}
