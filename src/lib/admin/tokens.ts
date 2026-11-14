import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET || "";
  if (s.length < 16) throw new Error("ADMIN_SESSION_SECRET is missing or too short");
  return s;
}

function b64url(buf: Buffer) {
  return buf.toString("base64url");
}

export function signPayload(payload: object): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64url(createHmac("sha256", secret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyPayload<T>(token: string): T | null {
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = b64url(createHmac("sha256", secret()).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export type SessionPayload = {
  sub: string;
  username: string;
  name: string;
  role: "master" | "worker";
  exp: number;
};

export function issueSession(user: { id: string; username: string; name: string; role: "master" | "worker" }, hours = 12) {
  return signPayload({
    sub: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    exp: Date.now() + hours * 3600 * 1000,
  } satisfies SessionPayload);
}

export function readSession(token: string): SessionPayload | null {
  const p = verifyPayload<SessionPayload>(token);
  if (!p || typeof p.exp !== "number" || p.exp < Date.now()) return null;
  if (p.role !== "master" && p.role !== "worker") return null;
  return p;
}

export type RevertPayload = { typ: "revert"; id: string; exp: number };

export function issueRevertToken(activityId: string, days = 7) {
  return signPayload({ typ: "revert", id: activityId, exp: Date.now() + days * 86400 * 1000 } satisfies RevertPayload);
}

export function readRevertToken(token: string): string | null {
  const p = verifyPayload<RevertPayload>(token);
  if (!p || p.typ !== "revert" || typeof p.id !== "string" || p.exp < Date.now()) return null;
  return p.id;
}

export function issuePdfUploadToken(orderId: string, minutes = 20) {
  return signPayload({ typ: "pdf-upload", id: orderId, exp: Date.now() + minutes * 60 * 1000 });
}

export function readPdfUploadToken(token: string): string | null {
  const p = verifyPayload<{ typ?: string; id?: string; exp?: number }>(token);
  if (!p || p.typ !== "pdf-upload" || typeof p.id !== "string" || !p.exp || p.exp < Date.now()) return null;
  return p.id;
}

export function randomId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}
