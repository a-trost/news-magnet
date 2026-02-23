import { getDb } from "../database";
import type { AppSetting } from "@shared/types";

export function getAllSettings(): AppSetting[] {
  return getDb().query("SELECT * FROM app_settings").all() as AppSetting[];
}

export function getSetting(key: string): AppSetting | null {
  return (getDb().query("SELECT * FROM app_settings WHERE key = ?").get(key) as AppSetting) ?? null;
}

export function getSettingValue(key: string): string | null {
  const row = getSetting(key);
  return row?.value ?? null;
}

export function upsertSetting(key: string, value: string): void {
  getDb().run(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value],
  );
}
