import { getDb } from "../database";
import type { Criteria, CreateCriteriaInput, UpdateCriteriaInput } from "@shared/types";

function rowToCriteria(row: any): Criteria {
  return {
    ...row,
    is_active: Boolean(row.is_active),
  };
}

export function getAllCriteria(): Criteria[] {
  const rows = getDb().query("SELECT * FROM criteria ORDER BY created_at DESC").all();
  return rows.map(rowToCriteria);
}

export function getActiveCriteria(): Criteria[] {
  const rows = getDb().query("SELECT * FROM criteria WHERE is_active = 1 ORDER BY created_at DESC").all();
  return rows.map(rowToCriteria);
}

export function getCriteriaById(id: number): Criteria | null {
  const row = getDb().query("SELECT * FROM criteria WHERE id = ?").get(id);
  return row ? rowToCriteria(row) : null;
}

export function createCriteria(input: CreateCriteriaInput): Criteria {
  const result = getDb()
    .query(
      `INSERT INTO criteria (name, description, is_active) VALUES (?, ?, ?) RETURNING *`
    )
    .get(input.name, input.description, input.is_active !== false ? 1 : 0);
  return rowToCriteria(result);
}

export function updateCriteria(id: number, input: UpdateCriteriaInput): Criteria | null {
  const existing = getCriteriaById(id);
  if (!existing) return null;

  const name = input.name ?? existing.name;
  const description = input.description ?? existing.description;
  const isActive = input.is_active !== undefined ? (input.is_active ? 1 : 0) : (existing.is_active ? 1 : 0);

  const result = getDb()
    .query(
      `UPDATE criteria SET name = ?, description = ?, is_active = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`
    )
    .get(name, description, isActive, id);
  return result ? rowToCriteria(result) : null;
}

export function deleteCriteria(id: number): boolean {
  const result = getDb().run("DELETE FROM criteria WHERE id = ?", [id]);
  return result.changes > 0;
}
