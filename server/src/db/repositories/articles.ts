import { getDb } from "../database";
import type { Article, RawArticle, ArticleFilters, PaginatedArticles } from "@shared/types";
import type { ProcessedShowNotes } from "../../llm/show-prep";

function rowToArticle(row: any): Article {
  return {
    ...row,
    is_relevant: row.is_relevant === null ? null : Boolean(row.is_relevant),
    is_saved: Boolean(row.is_saved),
  };
}

export function getArticles(filters: ArticleFilters = {}): PaginatedArticles {
  const {
    sourceId,
    isRelevant,
    isSaved,
    minScore,
    search,
    sort = "newest",
    page = 1,
    limit = 50,
    episodeId,
    unassigned,
  } = filters;

  const conditions: string[] = [];
  const params: any[] = [];

  if (sourceId !== undefined) {
    conditions.push("a.source_id = ?");
    params.push(sourceId);
  }
  if (isRelevant !== undefined) {
    conditions.push("a.is_relevant = ?");
    params.push(isRelevant ? 1 : 0);
  }
  if (isSaved !== undefined) {
    conditions.push("a.is_saved = ?");
    params.push(isSaved ? 1 : 0);
  }
  if (minScore !== undefined) {
    conditions.push("a.relevance_score >= ?");
    params.push(minScore);
  }
  if (search) {
    conditions.push("(a.title LIKE ? OR a.summary LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (episodeId !== undefined) {
    conditions.push("a.episode_id = ?");
    params.push(episodeId);
  }
  if (unassigned) {
    conditions.push("a.is_saved = 1 AND a.episode_id IS NULL");
  }

  // Hide articles belonging to archived episodes unless querying a specific episode
  if (episodeId === undefined) {
    conditions.push("(e.is_archived IS NULL OR e.is_archived = 0)");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const join = "LEFT JOIN episodes e ON a.episode_id = e.id";

  const sortMap: Record<string, string> = {
    newest: "a.filtered_at IS NOT NULL, a.is_saved DESC, a.published_at DESC NULLS LAST, a.created_at DESC",
    oldest: "a.filtered_at IS NOT NULL, a.is_saved DESC, a.published_at ASC NULLS LAST, a.created_at ASC",
    score_desc: "a.filtered_at IS NOT NULL, a.is_saved DESC, a.relevance_score DESC NULLS LAST, a.created_at DESC",
    score_asc: "a.filtered_at IS NOT NULL, a.is_saved DESC, a.relevance_score ASC NULLS LAST, a.created_at ASC",
    display_order: "a.display_order ASC NULLS LAST, a.created_at DESC",
  };
  const orderBy = sortMap[sort] || sortMap.newest;

  const countRow = getDb()
    .query(`SELECT COUNT(*) as total FROM articles a ${join} ${where}`)
    .get(...params) as { total: number };

  const offset = (page - 1) * limit;
  const rows = getDb()
    .query(
      `SELECT a.* FROM articles a ${join} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  return {
    articles: rows.map(rowToArticle),
    total: countRow.total,
    page,
    limit,
    totalPages: Math.ceil(countRow.total / limit),
  };
}

export function getArticleById(id: number): Article | null {
  const row = getDb().query("SELECT * FROM articles WHERE id = ?").get(id);
  return row ? rowToArticle(row) : null;
}

export function insertArticles(sourceId: number, rawArticles: RawArticle[]): number {
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // Filter out articles older than 2 weeks (keep articles with no date)
  const recent = rawArticles.filter((a) => {
    if (!a.published_at) return true;
    try {
      return new Date(a.published_at).toISOString() >= twoWeeksAgo;
    } catch {
      return true;
    }
  });

  // Look up existing URLs for this source in one query
  const existingRows = getDb()
    .query("SELECT url FROM articles WHERE source_id = ?")
    .all(sourceId) as { url: string }[];
  const existingUrls = new Set(existingRows.map((r) => r.url));

  const stmt = getDb().prepare(
    `INSERT INTO articles (source_id, external_id, title, url, summary, author, published_at, raw_content)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let inserted = 0;
  const insertMany = getDb().transaction((articles: RawArticle[]) => {
    for (const a of articles) {
      if (!a.url || existingUrls.has(a.url)) continue;
      stmt.run(
        sourceId,
        a.external_id,
        a.title,
        a.url,
        a.summary || null,
        a.author || null,
        a.published_at || null,
        a.raw_content || null
      );
      existingUrls.add(a.url);
      inserted++;
    }
  });

  insertMany(recent);
  return inserted;
}

export function getUnfilteredArticles(limit: number = 100): Article[] {
  const rows = getDb()
    .query("SELECT * FROM articles WHERE filtered_at IS NULL ORDER BY created_at DESC LIMIT ?")
    .all(limit);
  return rows.map(rowToArticle);
}

export function updateArticleRelevance(
  id: number,
  score: number,
  reason: string,
  isRelevant: boolean
): void {
  getDb().run(
    `UPDATE articles SET relevance_score = ?, relevance_reason = ?, is_relevant = ?, filtered_at = datetime('now') WHERE id = ?`,
    [score, reason, isRelevant ? 1 : 0, id]
  );
}

export function clearAllScores(): number {
  const result = getDb().run(
    "UPDATE articles SET relevance_score = NULL, relevance_reason = NULL, is_relevant = NULL, filtered_at = NULL"
  );
  return result.changes;
}

export function deleteArticle(id: number): boolean {
  const result = getDb().run("DELETE FROM articles WHERE id = ?", [id]);
  return result.changes > 0;
}

export function deleteArticlesBySource(sourceId: number): number {
  const result = getDb().run("DELETE FROM articles WHERE source_id = ?", [sourceId]);
  return result.changes;
}

export function deleteOldArticles(): number {
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const result = getDb().run(
    "DELETE FROM articles WHERE published_at IS NOT NULL AND published_at < ? AND episode_id IS NULL",
    [twoWeeksAgo]
  );
  return result.changes;
}

export function deleteUnsavedArticles(): number {
  const result = getDb().run("DELETE FROM articles WHERE is_saved = 0 AND episode_id IS NULL");
  return result.changes;
}

export function saveArticle(id: number): boolean {
  const result = getDb().run(
    "UPDATE articles SET is_saved = 1, saved_at = datetime('now') WHERE id = ?",
    [id]
  );
  return result.changes > 0;
}

export function unsaveArticle(id: number): boolean {
  const result = getDb().run(
    "UPDATE articles SET is_saved = 0, saved_at = NULL, episode_id = NULL WHERE id = ?",
    [id]
  );
  return result.changes > 0;
}

export function getUnprocessedSavedArticles(): Article[] {
  const rows = getDb()
    .query("SELECT * FROM articles WHERE is_saved = 1 AND processed_at IS NULL ORDER BY created_at DESC")
    .all();
  return rows.map(rowToArticle);
}

export function updateShowNotes(id: number, sections: ProcessedShowNotes): void {
  getDb().run(
    "UPDATE articles SET notes_summary = ?, notes_why = ?, notes_comedy = ?, notes_skit = ?, notes_talking = ?, notes_draft = ?, processed_at = datetime('now') WHERE id = ?",
    [sections.notes_summary, sections.notes_why, sections.notes_comedy, sections.notes_skit, sections.notes_talking, sections.notes_draft, id]
  );
}

export type ShowNotesSection = "notes_summary" | "notes_why" | "notes_comedy" | "notes_skit" | "notes_talking" | "notes_draft";

export function updateShowNotesSection(id: number, section: ShowNotesSection, content: string): void {
  const allowedColumns: Record<ShowNotesSection, true> = {
    notes_summary: true,
    notes_why: true,
    notes_comedy: true,
    notes_skit: true,
    notes_talking: true,
    notes_draft: true,
  };
  if (!allowedColumns[section]) throw new Error(`Invalid section: ${section}`);
  getDb().run(`UPDATE articles SET ${section} = ? WHERE id = ?`, [content, id]);
}

export function updateScript(id: number, script: string): void {
  getDb().run("UPDATE articles SET script = ? WHERE id = ?", [script, id]);
}

export function updateSegmentTitle(id: number, segmentTitle: string): void {
  getDb().run("UPDATE articles SET segment_title = ? WHERE id = ?", [segmentTitle, id]);
}

export function markProcessed(id: number): void {
  getDb().run("UPDATE articles SET processed_at = datetime('now') WHERE id = ?", [id]);
}

export function clearShowNotes(id: number): void {
  getDb().run(
    "UPDATE articles SET notes_summary = NULL, notes_why = NULL, notes_comedy = NULL, notes_skit = NULL, notes_talking = NULL, processed_at = NULL WHERE id = ?",
    [id]
  );
}

function getManualSourceId(): number {
  const db = getDb();
  const row = db.query("SELECT id FROM sources WHERE config_key = 'manual'").get() as { id: number } | null;
  if (row) return row.id;
  db.run(
    "INSERT INTO sources (name, type, config, config_key, enabled) VALUES ('Manual', 'webpage', '{}', 'manual', 0)"
  );
  const inserted = db.query("SELECT id FROM sources WHERE config_key = 'manual'").get() as { id: number };
  return inserted.id;
}

export function insertManualArticle(data: {
  url: string;
  title: string;
  summary: string | null;
  author: string | null;
  published_at: string | null;
}): Article {
  const db = getDb();
  const manualSourceId = getManualSourceId();
  const existing = db
    .query("SELECT id FROM articles WHERE url = ?")
    .get(data.url) as { id: number } | null;
  if (existing) {
    throw new Error("DUPLICATE");
  }

  db.run(
    `INSERT INTO articles (source_id, external_id, title, url, summary, author, published_at, relevance_score, relevance_reason, is_relevant, filtered_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1.0, 'Manually added', 1, datetime('now'))`,
    [manualSourceId, data.url, data.title, data.url, data.summary, data.author, data.published_at]
  );

  const row = db.query("SELECT * FROM articles WHERE id = last_insert_rowid()").get();
  return rowToArticle(row);
}

export function updateDisplayOrder(orderedIds: number[]): void {
  const stmt = getDb().prepare("UPDATE articles SET display_order = ? WHERE id = ?");
  const updateAll = getDb().transaction((ids: number[]) => {
    for (let i = 0; i < ids.length; i++) {
      stmt.run(i, ids[i]);
    }
  });
  updateAll(orderedIds);
}
