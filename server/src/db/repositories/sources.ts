import { getDb } from "../database";
import type { Source, CreateSourceInput, UpdateSourceInput } from "@shared/types";

function rowToSource(row: any): Source {
  return {
    ...row,
    config: JSON.parse(row.config),
    enabled: Boolean(row.enabled),
    config_key: row.config_key ?? null,
  };
}

export function getAllSources(): Source[] {
  const rows = getDb().query("SELECT * FROM sources ORDER BY created_at DESC").all();
  return rows.map(rowToSource);
}

export function getSourceById(id: number): Source | null {
  const row = getDb().query("SELECT * FROM sources WHERE id = ?").get(id);
  return row ? rowToSource(row) : null;
}

export function getEnabledSources(): Source[] {
  const rows = getDb().query("SELECT * FROM sources WHERE enabled = 1 ORDER BY created_at DESC").all();
  return rows.map(rowToSource);
}

export function createSource(input: CreateSourceInput): Source {
  const result = getDb()
    .query(
      `INSERT INTO sources (name, type, config, enabled) VALUES (?, ?, ?, ?) RETURNING *`
    )
    .get(input.name, input.type, JSON.stringify(input.config), input.enabled !== false ? 1 : 0);
  return rowToSource(result);
}

export function updateSource(id: number, input: UpdateSourceInput): Source | null {
  const existing = getSourceById(id);
  if (!existing) return null;

  const name = input.name ?? existing.name;
  const config = input.config ? JSON.stringify(input.config) : JSON.stringify(existing.config);
  const enabled = input.enabled !== undefined ? (input.enabled ? 1 : 0) : (existing.enabled ? 1 : 0);

  const result = getDb()
    .query(
      `UPDATE sources SET name = ?, config = ?, enabled = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`
    )
    .get(name, config, enabled, id);
  return result ? rowToSource(result) : null;
}

export function deleteSource(id: number): boolean {
  const result = getDb().run("DELETE FROM sources WHERE id = ?", [id]);
  return result.changes > 0;
}

export function updateLastFetchedAt(id: number): void {
  getDb().run("UPDATE sources SET last_fetched_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", [id]);
}
