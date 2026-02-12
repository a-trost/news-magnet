import { Hono } from "hono";
import * as articlesRepo from "../db/repositories/articles";
import type { ArticleFilters } from "@shared/types";

export const articlesRouter = new Hono();

articlesRouter.get("/", (c) => {
  const query = c.req.query();
  const filters: ArticleFilters = {
    sourceId: query.sourceId ? Number(query.sourceId) : undefined,
    isRelevant: query.isRelevant !== undefined ? query.isRelevant === "true" : undefined,
    isSaved: query.isSaved !== undefined ? query.isSaved === "true" : undefined,
    minScore: query.minScore ? Number(query.minScore) : undefined,
    search: query.search || undefined,
    sort: (query.sort as ArticleFilters["sort"]) || undefined,
    page: query.page ? Number(query.page) : undefined,
    limit: query.limit ? Number(query.limit) : undefined,
  };
  const result = articlesRepo.getArticles(filters);
  return c.json({ data: result });
});

articlesRouter.post("/clear-unsaved", (c) => {
  const deleted = articlesRepo.deleteUnsavedArticles();
  return c.json({ data: { deleted } });
});

articlesRouter.post("/:id/save", (c) => {
  const id = Number(c.req.param("id"));
  const saved = articlesRepo.saveArticle(id);
  if (!saved) return c.json({ error: "Article not found" }, 404);
  return c.json({ data: { success: true } });
});

articlesRouter.post("/:id/unsave", (c) => {
  const id = Number(c.req.param("id"));
  const unsaved = articlesRepo.unsaveArticle(id);
  if (!unsaved) return c.json({ error: "Article not found" }, 404);
  return c.json({ data: { success: true } });
});

articlesRouter.delete("/:id", (c) => {
  const id = Number(c.req.param("id"));
  const deleted = articlesRepo.deleteArticle(id);
  if (!deleted) return c.json({ error: "Article not found" }, 404);
  return c.json({ data: { success: true } });
});
