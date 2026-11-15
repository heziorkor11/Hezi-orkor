import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { adminDataRepo, ephemeralDir } from "./config";
import { githubRepoIsPrivate } from "./git-catalog.server";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  normalizeNotificationSettings,
  type NotificationSettings,
} from "./notification-settings";

const FILE = "notification-settings.json";

async function localPath() {
  const dir = join(ephemeralDir(), "private");
  await mkdir(dir, { recursive: true });
  return join(dir, FILE);
}

async function readFromGit(): Promise<NotificationSettings | null> {
  if (!adminDataRepo()) return null;
  try {
    const { assertPrivateDataRepo, privateNotificationSettingsPath, readPrivateFile } = await import(
      "./git-private.server.ts"
    );
    await assertPrivateDataRepo();
    const file = await readPrivateFile(privateNotificationSettingsPath());
    if (!file) return null;
    return normalizeNotificationSettings(JSON.parse(file.content));
  } catch {
    return null;
  }
}

export async function readNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await readFile(await localPath(), "utf8");
    return normalizeNotificationSettings(JSON.parse(raw));
  } catch {
    /* empty */
  }
  const fromGit = await readFromGit();
  if (fromGit) {
    await writeFile(await localPath(), `${JSON.stringify(fromGit, null, 2)}\n`, "utf8");
    return fromGit;
  }
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    enabled: { ...DEFAULT_NOTIFICATION_SETTINGS.enabled },
    extraAddresses: [],
  };
}

export async function saveNotificationSettings(next: NotificationSettings): Promise<NotificationSettings> {
  const normalized = normalizeNotificationSettings(next);
  const content = `${JSON.stringify(normalized, null, 2)}\n`;
  await writeFile(await localPath(), content, "utf8");
  const dataRepo = adminDataRepo();
  if (dataRepo) {
    const priv = await githubRepoIsPrivate(dataRepo);
    if (priv === true) {
      const { commitPrivateFile, privateNotificationSettingsPath } = await import("./git-private.server.ts");
      await commitPrivateFile({
        path: privateNotificationSettingsPath(),
        content,
        message: "chore(admin): update notification settings (private)",
      });
    }
  }
  return normalized;
}
