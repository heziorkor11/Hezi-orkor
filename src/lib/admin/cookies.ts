import { sessionCookieName } from "./config";

export function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function sessionFromRequest(req: Request): string | null {
  return parseCookie(req.headers.get("cookie"), sessionCookieName());
}

export function setSessionCookieHeader(token: string, maxAgeSec = 12 * 3600) {
  const name = sessionCookieName();
  const host = name.startsWith("__Host-");
  const parts = [
    `${name}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSec}`,
  ];
  if (host || process.env.VERCEL) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookieHeader() {
  const name = sessionCookieName();
  const host = name.startsWith("__Host-");
  const parts = [`${name}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (host || process.env.VERCEL) parts.push("Secure");
  return parts.join("; ");
}
