import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { adminDataRepo, ephemeralDir } from "./config.ts";
import { hashPassword, verifyPassword } from "./passwords.ts";
import { randomId } from "./tokens.ts";
import type { AdminUser, SafeUser } from "./types.ts";
import {
  commitPrivateFile,
  privateUsersPath,
  readPrivateFile,
  assertPrivateDataRepo,
  privateDataRepoReady,
} from "./git-private.server.ts";

const FILE = "private-users.json";

const HASH_RE = /^scrypt:[0-9a-f]+:[0-9a-f]+$/i;

export async function usersPersistence(): Promise<{ durable: boolean; reason: string; path?: string }> {
  if (await privateDataRepoReady()) {
    return {
      durable: true,
      reason: "private-data-repo",
      path: privateUsersPath(),
    };
  }
  if (adminDataRepo()) {
    return {
      durable: false,
      reason: "המאגר שצוין ב-ADMIN_DATA_GITHUB_REPO חסר או שאינו פרטי — משתמשים לא יישמרו שם.",
    };
  }
  return {
    durable: false,
    reason: "משתמשים נשמרים באחסון זמני של המופע עד שיחובר מאגר פרטי.",
  };
}

async function localPath() {
  const dir = join(ephemeralDir(), "private");
  await mkdir(dir, { recursive: true });
  return join(dir, FILE);
}

function isScryptHash(value: unknown): value is string {
  return typeof value === "string" && HASH_RE.test(value) && !value.includes("\n");
}

/** Drop plaintext and unknown secret fields. Never persist a password, only a scrypt hash. */
export function sanitizeStoredUser(raw: unknown): AdminUser | null {
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;
  if ("password" in u && u.password) return null;
  if (!isScryptHash(u.passwordHash)) return null;
  const username = typeof u.username === "string" ? u.username.trim().toLowerCase() : "";
  if (!username) return null;
  const role = u.role === "master" || u.role === "worker" ? u.role : null;
  if (!role) return null;
  const id = typeof u.id === "string" && u.id.trim() ? u.id.trim() : randomId("user");
  const name = typeof u.name === "string" && u.name.trim() ? u.name.trim() : username;
  return {
    id,
    username,
    name,
    role,
    active: u.active !== false,
    passwordHash: u.passwordHash,
  };
}

export function serializeUsersFile(users: AdminUser[]): string {
  const safe: AdminUser[] = [];
  for (const u of users) {
    const cleaned = sanitizeStoredUser(u);
    if (!cleaned) throw new Error("Refusing to store a user without a scrypt password hash");
    safe.push(cleaned);
  }
  return `${JSON.stringify({ version: 1, users: safe }, null, 2)}\n`;
}

function parseUsersFile(text: string): AdminUser[] {
  try {
    const data = JSON.parse(text) as { users?: unknown };
    if (!Array.isArray(data.users)) return [];
    return data.users.map(sanitizeStoredUser).filter((u): u is AdminUser => Boolean(u));
  } catch {
    return [];
  }
}

async function readLocal(): Promise<AdminUser[]> {
  try {
    return parseUsersFile(await readFile(await localPath(), "utf8"));
  } catch {
    return [];
  }
}

async function writeLocal(users: AdminUser[]) {
  await writeFile(await localPath(), serializeUsersFile(users), "utf8");
}

async function readFromPrivateRepo(): Promise<AdminUser[] | null> {
  if (!adminDataRepo()) return null;
  try {
    await assertPrivateDataRepo();
    const file = await readPrivateFile(privateUsersPath());
    if (!file) return [];
    return parseUsersFile(file.content);
  } catch {
    return null;
  }
}

async function readStored(): Promise<AdminUser[]> {
  const fromGit = await readFromPrivateRepo();
  if (fromGit && fromGit.length) {
    await writeLocal(fromGit);
    return fromGit;
  }
  const local = await readLocal();
  if (local.length) return local;
  return fromGit || [];
}

async function writeStored(users: AdminUser[]) {
  const text = serializeUsersFile(users);
  await writeLocal(users);
  const persist = await usersPersistence();
  if (!persist.durable) return;
  await commitPrivateFile({
    path: privateUsersPath(),
    content: text,
    message: "chore(admin): update users (private)",
  });
}

async function bootstrapUsers(): Promise<AdminUser[]> {
  const existing = await readStored();
  const byUsername = new Map(existing.map((u) => [u.username.toLowerCase(), u]));
  const e = process.env;
  let changed = false;

  const masterUser = (e.ADMIN_MASTER_USERNAME || "matan").trim().toLowerCase();
  const masterPass = e.ADMIN_MASTER_PASSWORD;
  const masterHash = e.ADMIN_MASTER_PASSWORD_HASH;
  if (!byUsername.has(masterUser) && (masterPass || masterHash)) {
    const passwordHash = masterHash && isScryptHash(masterHash) ? masterHash : await hashPassword(masterPass as string);
    if (!isScryptHash(passwordHash)) throw new Error("Master password hash is invalid");
    const user: AdminUser = {
      id: "user_master",
      username: masterUser,
      name: e.ADMIN_MASTER_NAME || "מתן יחזקאלי",
      role: "master",
      active: true,
      passwordHash,
    };
    byUsername.set(masterUser, user);
    changed = true;
  }

  const workerUser = (e.ADMIN_WORKER_USERNAME || "").trim().toLowerCase();
  const workerPass = e.ADMIN_WORKER_PASSWORD;
  if (workerUser && workerPass && !byUsername.has(workerUser)) {
    const user: AdminUser = {
      id: "user_worker_demo",
      username: workerUser,
      name: e.ADMIN_WORKER_NAME || "יואב לוי",
      role: "worker",
      active: true,
      passwordHash: await hashPassword(workerPass),
    };
    byUsername.set(workerUser, user);
    changed = true;
  }

  const users = [...byUsername.values()];
  if (changed && users.length) await writeStored(users);
  return users;
}

export function toSafe(u: AdminUser): SafeUser {
  return { id: u.id, username: u.username, name: u.name, role: u.role, active: u.active };
}

export async function listUsers(): Promise<SafeUser[]> {
  return (await bootstrapUsers()).map(toSafe);
}

export async function findUser(username: string): Promise<AdminUser | null> {
  const u = (await bootstrapUsers()).find((x) => x.username.toLowerCase() === username.trim().toLowerCase());
  return u || null;
}

export async function findUserById(id: string): Promise<AdminUser | null> {
  return (await bootstrapUsers()).find((x) => x.id === id) || null;
}

export async function authenticate(username: string, password: string): Promise<AdminUser | null> {
  const user = await findUser(username);
  if (!user || !user.active) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user : null;
}

export async function addUser(input: {
  username: string;
  name: string;
  role: "master" | "worker";
  password: string;
}): Promise<SafeUser> {
  const users = await bootstrapUsers();
  const username = input.username.trim().toLowerCase();
  if (!username || !input.password || input.password.length < 8) {
    throw new Error("שם משתמש וסיסמה (8 תווים לפחות) הם חובה");
  }
  if (users.some((u) => u.username === username)) throw new Error("שם המשתמש כבר קיים");
  const user: AdminUser = {
    id: randomId("user"),
    username,
    name: input.name.trim() || username,
    role: input.role,
    active: true,
    passwordHash: await hashPassword(input.password),
  };
  users.push(user);
  await writeStored(users);
  return toSafe(user);
}

export async function setUserActive(id: string, active: boolean): Promise<SafeUser> {
  const users = await bootstrapUsers();
  const user = users.find((u) => u.id === id);
  if (!user) throw new Error("משתמש לא נמצא");
  if (user.id === "user_master" && !active) throw new Error("לא ניתן להשבית את חשבון המאסטר הראשי");
  user.active = active;
  await writeStored(users);
  return toSafe(user);
}

export async function deleteUser(id: string): Promise<SafeUser> {
  const users = await bootstrapUsers();
  const user = users.find((u) => u.id === id);
  if (!user) throw new Error("משתמש לא נמצא");
  if (user.id === "user_master") throw new Error("לא ניתן למחוק את חשבון המאסטר הראשי");
  await writeStored(users.filter((u) => u.id !== id));
  return toSafe(user);
}

/** Test helper: wipe the in-process assumption that git/local already ran in this module. (no cache today) */
export async function resetUsersCacheForTests() {
  /* readStored always hits disk/git; hook reserved if we add a memory cache */
}
