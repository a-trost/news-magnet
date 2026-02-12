import { getDb } from "../database";
import type { FetchLog } from "@shared/types";

function rowToFetchLog(row: any): FetchLog {
  return row as FetchLog;
}

export function createFetchLog(
  sourceId: number,
  status: "success" | "error",
  articlesFound: number,
  errorMessage?: string
): FetchLog {
  const result = getDb()
    .query(
      `INSERT INTO fetch_log (source_id, status, articles_found, error_message) VALUES (?, ?, ?, ?) RETURNING *`
    )
    .get(sourceId, status, articlesFound, errorMessage || null);
  return rowToFetchLog(result);
}

export function getFetchLogs(limit: number = 50): FetchLog[] {
  const rows = getDb()
    .query("SELECT * FROM fetch_log ORDER BY started_at DESC LIMIT ?")
    .all(limit);
  return rows.map(rowToFetchLog);
}

export function getFetchLogsBySource(sourceId: number, limit: number = 20): FetchLog[] {
  const rows = getDb()
    .query("SELECT * FROM fetch_log WHERE source_id = ? ORDER BY started_at DESC LIMIT ?")
    .all(sourceId, limit);
  return rows.map(rowToFetchLog);
}
