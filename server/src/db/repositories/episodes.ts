import { getDb } from "../database";
import type { Episode, CreateEpisodeInput, UpdateEpisodeInput } from "@shared/types";

function rowToEpisode(row: any): Episode {
  return {
    ...row,
    is_archived: Boolean(row.is_archived),
  };
}

export function getAllEpisodes(): Episode[] {
  const rows = getDb().query("SELECT * FROM episodes ORDER BY created_at DESC").all();
  return rows.map(rowToEpisode);
}

export function getEpisodeById(id: number): Episode | null {
  const row = getDb().query("SELECT * FROM episodes WHERE id = ?").get(id);
  return row ? rowToEpisode(row) : null;
}

export function getActiveEpisodes(): Episode[] {
  const rows = getDb()
    .query("SELECT * FROM episodes WHERE is_archived = 0 ORDER BY created_at DESC")
    .all();
  return rows.map(rowToEpisode);
}

export function createEpisode(input: CreateEpisodeInput): Episode {
  const result = getDb()
    .query(
      `INSERT INTO episodes (title, episode_number, air_date) VALUES (?, ?, ?) RETURNING *`
    )
    .get(input.title ?? "", input.episode_number ?? null, input.air_date ?? null);
  return rowToEpisode(result);
}

export function updateEpisode(id: number, input: UpdateEpisodeInput): Episode | null {
  const existing = getEpisodeById(id);
  if (!existing) return null;

  const title = input.title ?? existing.title;
  const episode_number = input.episode_number !== undefined ? input.episode_number : existing.episode_number;
  const air_date = input.air_date !== undefined ? input.air_date : existing.air_date;
  const is_archived = input.is_archived !== undefined ? (input.is_archived ? 1 : 0) : (existing.is_archived ? 1 : 0);
  const notes = input.notes !== undefined ? input.notes : existing.notes;

  const result = getDb()
    .query(
      `UPDATE episodes SET title = ?, episode_number = ?, air_date = ?, is_archived = ?, notes = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`
    )
    .get(title, episode_number, air_date, is_archived, notes, id);
  return result ? rowToEpisode(result) : null;
}

export function deleteEpisode(id: number): boolean {
  const result = getDb().run("DELETE FROM episodes WHERE id = ?", [id]);
  return result.changes > 0;
}

export function addArticleToEpisode(articleId: number, episodeId: number): boolean {
  const result = getDb().run(
    "UPDATE articles SET episode_id = ? WHERE id = ?",
    [episodeId, articleId]
  );
  return result.changes > 0;
}

export function removeArticleFromEpisode(articleId: number): boolean {
  const result = getDb().run(
    "UPDATE articles SET episode_id = NULL WHERE id = ?",
    [articleId]
  );
  return result.changes > 0;
}

export function getNextEpisodeNumber(): number {
  const row = getDb()
    .query("SELECT MAX(episode_number) as max_num FROM episodes")
    .get() as { max_num: number | null };
  return (row.max_num ?? 0) + 1;
}
