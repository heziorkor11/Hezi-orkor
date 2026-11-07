/** Server-only storage boundary. Local JSON is NOT a production database. */
import { readFile, writeFile, mkdir, rename, open, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { initialAdminState, type AdminState } from "./types";
export interface AdminStorageAdapter {
  read(): Promise<AdminState>;
  transaction<T>(change: (state: AdminState) => T | Promise<T>): Promise<T>;
  putFile(bytes: Uint8Array, extension: string): Promise<string>;
  getFile(id: string): Promise<Uint8Array>;
}
export function localAdminEnabled() {
  return (
    process.env.ADMIN_LOCAL_ENABLED === "1" &&
    process.env.ADMIN_STORAGE === "local" &&
    !process.env.VERCEL
  );
}
export function localDataDirectory() {
  return resolve(process.env.ADMIN_DATA_DIR || ".data/admin");
}
export class LocalJsonAdminAdapter implements AdminStorageAdapter {
  constructor(readonly directory = localDataDirectory()) {}
  async read(): Promise<AdminState> {
    try {
      const s = JSON.parse(
        await readFile(join(this.directory, "state.json"), "utf8"),
      ) as AdminState;
      if (!Array.isArray(s.users) || !Array.isArray(s.audit) || typeof s.revision !== "number")
        throw new Error("Invalid admin state; recovery required");
      return s;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return initialAdminState();
      throw e;
    }
  }
  async transaction<T>(change: (s: AdminState) => T | Promise<T>): Promise<T> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const lockPath = join(this.directory, "write.lock");
    let lock;
    for (let i = 0; i < 150; i++) {
      try {
        lock = await open(lockPath, "wx", 0o600);
        break;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
        await new Promise((r) => setTimeout(r, 20));
      }
    }
    if (!lock)
      throw new Error("Storage busy; try again. Stale locks require local operator recovery.");
    try {
      const s = await this.read();
      const result = await change(s);
      s.revision++;
      const tmp = join(this.directory, `state.${randomUUID()}.tmp`);
      await writeFile(tmp, JSON.stringify(s), { mode: 0o600 });
      await rename(tmp, join(this.directory, "state.json"));
      return result;
    } finally {
      await lock.close();
      await unlink(lockPath);
    }
  }
  async putFile(bytes: Uint8Array, extension: string) {
    if (!["jpg", "png", "webp", "pdf"].includes(extension)) throw new Error("Unsupported file");
    const id = `${randomUUID()}.${extension}`;
    await mkdir(join(this.directory, "files"), { recursive: true, mode: 0o700 });
    await writeFile(join(this.directory, "files", id), bytes, { mode: 0o600 });
    return id;
  }
  async getFile(id: string) {
    if (!/^[a-f0-9-]{36}\.(jpg|png|webp|pdf)$/.test(id))
      throw new Error("Invalid media identifier");
    return readFile(join(this.directory, "files", id));
  }
}
export function adminStorage(): AdminStorageAdapter {
  if (!localAdminEnabled())
    throw new Error(
      "Admin storage not configured; external production services require owner approval",
    );
  return new LocalJsonAdminAdapter();
}
