import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ephemeralDir } from "./config";
import { hashPassword, verifyPassword } from "./passwords";
import { randomId } from "./tokens";
import type { AdminUser, SafeUser } from "./types";

const FILE = "private-users.json";

async function path() {
  const dir = join(ephemeralDir(), "private");
  await mkdir(dir, { recursive: true });
  return join(dir, FILE);
}

async function readStored(): Promise<AdminUser[]> {
  try {
    const data = JSON.parse(await readFile(await path(), "utf8")) as { users?: AdminUser[] };
    return Array.isArray(data.users) ? data.users : [];
  } catch {
    return [];
  }
}

async function writeStored(users: AdminUser[]) {
  await writeFile(await path(), `${JSON.stringify({ version: 1, users }, null, 2)}\n`, "utf8");
}

async function bootstrapUsers(): Promise<AdminUser[]> {
  const existing = await readStored();
  const byUsername = new Map(existing.map((u) => [u.username.toLowerCase(), u]));
  const e = process.env;

  const masterUser = (e.ADMIN_MASTER_USERNAME || "matan").trim().toLowerCase();
  const masterPass = e.ADMIN_MASTER_PASSWORD;
  const masterHash = e.ADMIN_MASTER_PASSWORD_HASH;
  if (!byUsername.has(masterUser) && (masterPass || masterHash)) {
    const user: AdminUser = {
      id: "user_master",
      username: masterUser,
      name: e.ADMIN_MASTER_NAME || "מתן יחזקאלי",
      role: "master",
      active: true,
      passwordHash: masterHash || (await hashPassword(masterPass as string)),
    };
    byUsername.set(masterUser, user);
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
  }

  const users = [...byUsername.values()];
  if (users.length) await writeStored(users);
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
