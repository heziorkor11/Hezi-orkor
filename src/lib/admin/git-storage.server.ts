/** Server-only, opt-in low-volume persistence. Never reads credentials in the browser. */
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import type { AdminStorageAdapter } from "./storage.server";
import { initialAdminState, type AdminState } from "./types";
const STATE = "admin-data/state.json";
const mediaId = /^[a-f0-9-]{36}\.(jpg|png|webp|pdf)$/;
const orderAudit = (action: string) => /^orders?\./.test(action);
export class GitHubAdminAdapter implements AdminStorageAdapter {
  private readonly repo: string;
  private readonly branch: string;
  private readonly token: string;
  private readonly key: Buffer;
  constructor(private readonly temporary: AdminStorageAdapter) {
    this.repo = process.env.ADMIN_GITHUB_REPO || "";
    this.branch = process.env.ADMIN_GITHUB_BRANCH || "";
    this.token = process.env.ADMIN_GITHUB_TOKEN || "";
    const key = process.env.ADMIN_GIT_ENCRYPTION_KEY || "";
    if (
      !/^[\w.-]+\/[\w.-]+$/.test(this.repo) ||
      !this.branch ||
      this.branch.length > 255 ||
      /[\x00-\x20]/.test(this.branch) ||
      !this.token ||
      !/^[a-f0-9]{64}$/i.test(key)
    )
      throw new Error("Git storage configuration is incomplete");
    this.key = Buffer.from(key, "hex");
  }
  private async request(path: string, init: RequestInit = {}, raw = false) {
    return fetch(`https://api.github.com/repos/${this.repo}${path}`, {
      ...init,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
        "Content-Type": "application/json",
      },
    });
  }
  private contents(path: string) {
    return `/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(this.branch)}`;
  }
  private async privateRepo() {
    const r = await this.request("");
    if (!r.ok) throw new Error(`Git repository visibility check failed (${r.status})`);
    const repo = await r.json();
    if (typeof repo.private !== "boolean") throw new Error("Git repository visibility is unknown");
    return repo.private as boolean; // Never infer privacy from configuration or package.json.
  }
  private seal(s: AdminState) {
    const iv = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", this.key, iv);
    // Authenticate against this repository and storage path: ciphertext cannot be transplanted.
    cipher.setAAD(Buffer.from(`${this.repo}:${STATE}`));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(s)), cipher.final()]);
    const encoded = JSON.stringify({
      format: 1,
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      data: ciphertext.toString("base64"),
    });
    if (Buffer.byteLength(encoded) > 900_000)
      throw new Error("Git admin state exceeds 900 KB; archive/migrate before continuing");
    return Buffer.from(encoded).toString("base64");
  }
  private unseal(content: string): AdminState {
    const e = JSON.parse(Buffer.from(content, "base64").toString("utf8"));
    if (e.format !== 1) throw new Error("Unsupported Git admin state format");
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(e.iv, "base64"));
    decipher.setAAD(Buffer.from(`${this.repo}:${STATE}`));
    decipher.setAuthTag(Buffer.from(e.tag, "base64"));
    const state = JSON.parse(
      Buffer.concat([decipher.update(Buffer.from(e.data, "base64")), decipher.final()]).toString(
        "utf8",
      ),
    );
    if (
      !Array.isArray(state.users) ||
      !Array.isArray(state.audit) ||
      !Array.isArray(state.orders) ||
      !Array.isArray(state.sessions) ||
      !state.products ||
      !state.home ||
      typeof state.revision !== "number"
    )
      throw new Error("Invalid Git admin state; recovery required");
    return state;
  }
  private durable(s: AdminState, privateRepo: boolean): AdminState {
    const result = structuredClone(s);
    if (!privateRepo) {
      result.orders = [];
      result.audit = result.audit.filter((a) => !orderAudit(a.action));
      result.assets = result.assets.filter((id) => !id.endsWith(".pdf"));
    }
    return result;
  }
  private async load() {
    const privateRepo = await this.privateRepo();
    const r = await this.request(this.contents(STATE));
    let s = initialAdminState(),
      sha: string | undefined;
    if (r.status !== 404) {
      if (!r.ok) throw new Error(`Git state read failed (${r.status})`);
      const file = await r.json();
      if (file.encoding !== "base64" || typeof file.content !== "string" || !file.sha)
        throw new Error("Git state is unreadable or too large");
      s = this.unseal(file.content);
      sha = file.sha;
    }
    s = this.durable(s, privateRepo);
    if (!privateRepo) {
      const temporary = await this.temporary.read();
      s.orders = temporary.orders;
      s.audit.push(...temporary.audit.filter((a) => orderAudit(a.action)));
      s.assets.push(...temporary.assets.filter((id) => id.endsWith(".pdf")));
    }
    return { state: s, sha, privateRepo };
  }
  async read() {
    return (await this.load()).state;
  }
  async transaction<T>(change: (state: AdminState) => T | Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { state, sha, privateRepo } = await this.load();
      const before = JSON.stringify(this.durable(state, privateRepo));
      const result = await change(state);
      const durable = this.durable(state, privateRepo);
      if (JSON.stringify(durable) !== before) {
        durable.revision++;
        const r = await this.request(`/contents/${STATE}`, {
          method: "PUT",
          body: JSON.stringify({
            branch: this.branch,
            message: "chore(admin): persist encrypted admin changes",
            content: this.seal(durable),
            ...(sha ? { sha } : {}),
          }),
        });
        if (r.status === 409 || r.status === 422) continue; // Re-read and reapply; never overwrite a competing edit.
        if (!r.ok) throw new Error(`Git state commit failed (${r.status})`);
      }
      if (!privateRepo)
        await this.temporary.transaction((s) => {
          s.orders = state.orders;
          s.audit = state.audit.filter((a) => orderAudit(a.action));
          s.assets = state.assets.filter((id) => id.endsWith(".pdf"));
        });
      return result;
    }
    throw new Error("Git storage busy/conflicting edits; retry the operation");
  }
  async putFile(bytes: Uint8Array, extension: string): Promise<string> {
    if (!["jpg", "png", "webp", "pdf"].includes(extension)) throw new Error("Unsupported file");
    if (bytes.byteLength > 4_000_000) throw new Error("Media exceeds 4 MB");
    const privateRepo = await this.privateRepo();
    if (extension === "pdf" && !privateRepo) return this.temporary.putFile(bytes, extension);
    const id = `${randomUUID()}.${extension}`;
    const r = await this.request(`/contents/admin-data/media/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        branch: this.branch,
        message: "chore(admin): store uploaded media",
        content: Buffer.from(bytes).toString("base64"),
      }),
    });
    if (!r.ok) throw new Error(`Git media commit failed (${r.status})`);
    return id;
  }
  async getFile(id: string): Promise<Uint8Array> {
    if (!mediaId.test(id)) throw new Error("Invalid media identifier");
    if (id.endsWith(".pdf") && !(await this.privateRepo())) return this.temporary.getFile(id);
    const r = await this.request(this.contents(`admin-data/media/${id}`), {}, true);
    if (!r.ok) throw new Error(`Git media read failed (${r.status})`);
    return new Uint8Array(await r.arrayBuffer());
  }
}
