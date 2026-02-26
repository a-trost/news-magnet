import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import * as articlesRepo from "../db/repositories/articles";
import { getActiveEpisodes, addArticleToEpisode } from "../db/repositories/episodes";
import { processArticleForShow, generateDraftSegment, refineDraftSegment, refineShowNotesSection, refineScript } from "../llm/show-prep";
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

    const voicePrompt = getSettingValue("voice_prompt") || "";
    let processed = 0;
    for (const article of articles) {
      await stream.writeSSE({
        event: "article-start",
        data: JSON.stringify({ id: article.id, title: article.title }),
      });

      try {
        const sections = await processArticleForShow(article, voicePrompt);
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

  // Fire-and-forget: process show notes + draft in the background
  const article = articlesRepo.getArticleById(id);
  if (article && !article.processed_at) {
    const voicePrompt = getSettingValue("voice_prompt") || "";
    processArticleForShow(article, voicePrompt)
      .then((sections) => articlesRepo.updateShowNotes(id, sections))
      .catch((err) => {
        console.error(`Auto-process failed for article ${id}:`, err);
        // Mark as processed so the UI spinner stops — user can retry via reprocess
        articlesRepo.markProcessed(id);
      });
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

articlesRouter.put("/:id/segment-title", async (c) => {
  const id = Number(c.req.param("id"));
  const { segmentTitle } = await c.req.json<{ segmentTitle: string }>();
  articlesRepo.updateSegmentTitle(id, segmentTitle);
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

articlesRouter.post("/:id/refine-draft", async (c) => {
  const id = Number(c.req.param("id"));
  const article = articlesRepo.getArticleById(id);
  if (!article) return c.json({ error: "Article not found" }, 404);
  if (!article.notes_draft) return c.json({ error: "No draft to refine" }, 400);

  const { instruction, currentDraft } = await c.req.json<{ instruction: string; currentDraft: string }>();
  if (!instruction?.trim()) return c.json({ error: "Instruction is required" }, 400);
  if (!currentDraft?.trim()) return c.json({ error: "Current draft is required" }, 400);

  try {
    const voicePrompt = getSettingValue("voice_prompt") || "";
    const html = await refineDraftSegment(currentDraft, instruction.trim(), voicePrompt);
    articlesRepo.updateShowNotesSection(id, "notes_draft", html);
    return c.json({ data: { notes_draft: html } });
  } catch (err: any) {
    return c.json({ error: `Draft refinement failed: ${err.message}` }, 500);
  }
});

const SECTION_LABELS: Record<string, string> = {
  notes_summary: "Summary",
  notes_why: "Why It Matters",
  notes_comedy: "Comedy Angles",
  notes_skit: "Skit Ideas",
  notes_talking: "Talking Points",
};

articlesRouter.post("/:id/refine-section", async (c) => {
  const id = Number(c.req.param("id"));
  const article = articlesRepo.getArticleById(id);
  if (!article) return c.json({ error: "Article not found" }, 404);

  const { section, instruction, currentContent } = await c.req.json<{
    section: ShowNotesSection;
    instruction: string;
    currentContent: string;
  }>();

  const label = SECTION_LABELS[section];
  if (!label) return c.json({ error: `Invalid section: ${section}` }, 400);
  if (!instruction?.trim()) return c.json({ error: "Instruction is required" }, 400);
  if (!currentContent?.trim()) return c.json({ error: "Current content is required" }, 400);

  try {
    const html = await refineShowNotesSection(article, currentContent, instruction.trim(), label);
    articlesRepo.updateShowNotesSection(id, section, html);
    return c.json({ data: { section, content: html } });
  } catch (err: any) {
    return c.json({ error: `Section refinement failed: ${err.message}` }, 500);
  }
});

articlesRouter.post("/:id/refine-script", async (c) => {
  const id = Number(c.req.param("id"));
  const article = articlesRepo.getArticleById(id);
  if (!article) return c.json({ error: "Article not found" }, 404);
  if (!article.script) return c.json({ error: "No script to refine" }, 400);

  const { instruction, currentScript } = await c.req.json<{ instruction: string; currentScript: string }>();
  if (!instruction?.trim()) return c.json({ error: "Instruction is required" }, 400);
  if (!currentScript?.trim()) return c.json({ error: "Current script is required" }, 400);

  try {
    const voicePrompt = getSettingValue("voice_prompt") || "";
    const html = await refineScript(currentScript, instruction.trim(), voicePrompt);
    articlesRepo.updateScript(id, html);
    return c.json({ data: { script: html } });
  } catch (err: any) {
    return c.json({ error: `Script refinement failed: ${err.message}` }, 500);
  }
});

articlesRouter.post("/:id/cancel-processing", (c) => {
  const id = Number(c.req.param("id"));
  const article = articlesRepo.getArticleById(id);
  if (!article) return c.json({ error: "Article not found" }, 404);
  articlesRepo.markProcessed(id);
  return c.json({ data: { success: true } });
});

articlesRouter.post("/:id/reprocess", async (c) => {
  const id = Number(c.req.param("id"));
  const article = articlesRepo.getArticleById(id);
  if (!article) return c.json({ error: "Article not found" }, 404);

  articlesRepo.clearShowNotes(id);
  try {
    const voicePrompt = getSettingValue("voice_prompt") || "";
    const sections = await processArticleForShow(article, voicePrompt);
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
