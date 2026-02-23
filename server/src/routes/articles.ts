import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import * as articlesRepo from "../db/repositories/articles";
import { getActiveEpisodes, addArticleToEpisode } from "../db/repositories/episodes";
import { processArticleForShow, generateDraftSegment } from "../llm/show-prep";
import { getSettingValue } from "../db/repositories/settings";
import { fetchArticleMetadata } from "../fetchers/metadata";
import type { ArticleFilters } from "@shared/types";
import type { ShowNotesSection } from "../db/repositories/articles";

export const articlesRouter = new Hono();

articlesRouter.get("/", async (c) => {
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
    episodeId: query.episodeId ? Number(query.episodeId) : undefined,
    unassigned: query.unassigned === "true" ? true : undefined,
  };
  const result = articlesRepo.getArticles(filters);
  return c.json({ data: result });
});

articlesRouter.post("/add-by-url", async (c) => {
  const { url } = await c.req.json<{ url: string }>();
  if (!url) return c.json({ error: "URL is required" }, 400);

  try {
    const metadata = await fetchArticleMetadata(url);
    const article = articlesRepo.insertManualArticle({
      url,
      title: metadata.title,
      summary: metadata.summary,
      author: metadata.author,
      published_at: metadata.published_at,
    });
    return c.json({ data: article });
  } catch (err: any) {
    if (err.message === "DUPLICATE") {
      return c.json({ error: "This URL has already been added" }, 409);
    }
    return c.json({ error: err.message }, 500);
  }
});

articlesRouter.put("/reorder", async (c) => {
  const { orderedIds } = await c.req.json<{ orderedIds: number[] }>();
  articlesRepo.updateDisplayOrder(orderedIds);
  return c.json({ data: { success: true } });
});

articlesRouter.post("/clear-unsaved", (c) => {
  const deleted = articlesRepo.deleteUnsavedArticles();
  return c.json({ data: { deleted } });
});

// Process saved articles with LLM (SSE stream)
articlesRouter.post("/process", async (c) => {
  const articles = articlesRepo.getUnprocessedSavedArticles();
  if (articles.length === 0) {
    return c.json({ data: { message: "No unprocessed articles", processed: 0 } });
  }

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      event: "process-start",
      data: JSON.stringify({ total: articles.length }),
    });

    let processed = 0;
    for (const article of articles) {
      await stream.writeSSE({
        event: "article-start",
        data: JSON.stringify({ id: article.id, title: article.title }),
      });

      try {
        const sections = await processArticleForShow(article);
        articlesRepo.updateShowNotes(article.id, sections);
        processed++;
        await stream.writeSSE({
          event: "article-done",
          data: JSON.stringify({ id: article.id, title: article.title, sections }),
        });
      } catch (err: any) {
        console.error(`Show prep failed for article ${article.id}:`, err);
        await stream.writeSSE({
          event: "article-done",
          data: JSON.stringify({ id: article.id, title: article.title, error: err.message }),
        });
      }
    }

    await stream.writeSSE({
      event: "process-complete",
      data: JSON.stringify({ processed, total: articles.length }),
    });
  });
});

articlesRouter.post("/:id/save", (c) => {
  const id = Number(c.req.param("id"));
  const saved = articlesRepo.saveArticle(id);
  if (!saved) return c.json({ error: "Article not found" }, 404);

  // Auto-assign to the most recent active episode
  const activeEpisodes = getActiveEpisodes();
  if (activeEpisodes.length > 0) {
    addArticleToEpisode(id, activeEpisodes[0].id);
  }

  // Fire-and-forget: process show notes in the background
  const article = articlesRepo.getArticleById(id);
  if (article && !article.processed_at) {
    processArticleForShow(article)
      .then((sections) => articlesRepo.updateShowNotes(id, sections))
      .catch((err) => console.error(`Auto-process failed for article ${id}:`, err));
  }

  return c.json({ data: { success: true } });
});

articlesRouter.post("/:id/unsave", (c) => {
  const id = Number(c.req.param("id"));
  const unsaved = articlesRepo.unsaveArticle(id);
  if (!unsaved) return c.json({ error: "Article not found" }, 404);
  return c.json({ data: { success: true } });
});

articlesRouter.put("/:id/show-notes", async (c) => {
  const id = Number(c.req.param("id"));
  const { section, content } = await c.req.json<{ section: ShowNotesSection; content: string }>();
  articlesRepo.updateShowNotesSection(id, section, content);
  return c.json({ data: { success: true } });
});

articlesRouter.put("/:id/script", async (c) => {
  const id = Number(c.req.param("id"));
  const { script } = await c.req.json<{ script: string }>();
  articlesRepo.updateScript(id, script);
  return c.json({ data: { success: true } });
});

articlesRouter.post("/:id/generate-draft", async (c) => {
  const id = Number(c.req.param("id"));
  const article = articlesRepo.getArticleById(id);
  if (!article) return c.json({ error: "Article not found" }, 404);
  if (!article.notes_summary) return c.json({ error: "Show notes must be generated first" }, 400);

  const { context } = await c.req.json<{ context?: string }>().catch(() => ({ context: undefined }));

  try {
    const voicePrompt = getSettingValue("voice_prompt") || "";
    const html = await generateDraftSegment(article, voicePrompt, context);
    articlesRepo.updateShowNotesSection(id, "notes_draft", html);
    return c.json({ data: { notes_draft: html } });
  } catch (err: any) {
    return c.json({ error: `Draft generation failed: ${err.message}` }, 500);
  }
});

articlesRouter.post("/:id/reprocess", async (c) => {
  const id = Number(c.req.param("id"));
  const article = articlesRepo.getArticleById(id);
  if (!article) return c.json({ error: "Article not found" }, 404);

  articlesRepo.clearShowNotes(id);
  try {
    const sections = await processArticleForShow(article);
    articlesRepo.updateShowNotes(id, sections);
    return c.json({ data: { sections } });
  } catch (err: any) {
    return c.json({ error: `Processing failed: ${err.message}` }, 500);
  }
});

articlesRouter.delete("/:id", (c) => {
  const id = Number(c.req.param("id"));
  const deleted = articlesRepo.deleteArticle(id);
  if (!deleted) return c.json({ error: "Article not found" }, 404);
  return c.json({ data: { success: true } });
});
