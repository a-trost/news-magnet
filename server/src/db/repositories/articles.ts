import { getDb } from "../database";
import type { Article, RawArticle, ArticleFilters, PaginatedArticles } from "@shared/types";

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

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sortMap: Record<string, string> = {
    newest: "a.published_at DESC NULLS LAST, a.created_at DESC",
    oldest: "a.published_at ASC NULLS LAST, a.created_at ASC",
    score_desc: "a.relevance_score DESC NULLS LAST, a.created_at DESC",
    score_asc: "a.relevance_score ASC NULLS LAST, a.created_at ASC",
  };
  const orderBy = sortMap[sort] || sortMap.newest;

  const countRow = getDb()
    .query(`SELECT COUNT(*) as total FROM articles a ${where}`)
    .get(...params) as { total: number };

  const offset = (page - 1) * limit;
  const rows = getDb()
    .query(
      `SELECT a.* FROM articles a ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
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

  const stmt = getDb().prepare(
    `INSERT OR IGNORE INTO articles (source_id, external_id, title, url, summary, author, published_at, raw_content)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let inserted = 0;
  const insertMany = getDb().transaction((articles: RawArticle[]) => {
    for (const a of articles) {
      const result = stmt.run(
        sourceId,
        a.external_id,
        a.title,
        a.url,
        a.summary || null,
        a.author || null,
        a.published_at || null,
        a.raw_content || null
      );
      if (result.changes > 0) inserted++;
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
    "DELETE FROM articles WHERE published_at IS NOT NULL AND published_at < ?",
    [twoWeeksAgo]
  );
  return result.changes;
}

export function deleteUnsavedArticles(): number {
  const result = getDb().run("DELETE FROM articles WHERE is_saved = 0");
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
    "UPDATE articles SET is_saved = 0, saved_at = NULL WHERE id = ?",
    [id]
  );
  return result.changes > 0;
}
