import fs from "fs";
import path from "path";
import { getDb } from "./database";
import type { SourceType } from "@shared/types";

interface SourceConfigEntry {
  key: string;
  name: string;
  type: SourceType;
  config: Record<string, unknown>;
  enabled?: boolean;
}

const SOURCES_JSON_PATH = path.resolve(import.meta.dir, "../../../sources.json");

export function syncSourcesFromConfig(): void {
  if (!fs.existsSync(SOURCES_JSON_PATH)) {
    return;
  }

  let entries: SourceConfigEntry[];
  try {
    const raw = fs.readFileSync(SOURCES_JSON_PATH, "utf-8");
    entries = JSON.parse(raw);
  } catch (err) {
    console.error("[sync-sources] Failed to parse sources.json:", err);
    return;
  }

  if (!Array.isArray(entries)) {
    console.error("[sync-sources] sources.json must be a JSON array");
    return;
  }

  const db = getDb();

  const upsert = db.query(`
    INSERT INTO sources (name, type, config, enabled, config_key)
    VALUES (?1, ?2, ?3, ?4, ?5)
    ON CONFLICT(config_key) DO UPDATE SET
      name = ?1,
      type = ?2,
      config = ?3,
      enabled = ?4,
      updated_at = datetime('now')
  `);

  const keysInFile = new Set<string>();

  for (const entry of entries) {
    if (!entry.key || !entry.name || !entry.type) {
      console.warn("[sync-sources] Skipping invalid entry (missing key/name/type):", entry);
      continue;
    }
    keysInFile.add(entry.key);
    upsert.run(
      entry.name,
      entry.type,
      JSON.stringify(entry.config ?? {}),
      entry.enabled !== false ? 1 : 0,
      entry.key
    );
  }

  // Warn about orphaned config sources (in DB but removed from file)
  const dbConfigSources = db
    .query("SELECT config_key FROM sources WHERE config_key IS NOT NULL")
    .all() as { config_key: string }[];

  for (const row of dbConfigSources) {
    if (!keysInFile.has(row.config_key)) {
      console.warn(
        `[sync-sources] Source with config_key "${row.config_key}" is in DB but not in sources.json`
      );
    }
  }

  console.log(`[sync-sources] Synced ${keysInFile.size} source(s) from sources.json`);
}
